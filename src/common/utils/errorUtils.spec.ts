import { formatErrorMessage, safeDisconnect, backfillTimestamps } from "src/common/utils/errorUtils";

describe("errorUtils", () => {
  describe("formatErrorMessage", () => {
    test("returns sqlMessage when present", () => {
      const err = { sqlMessage: "Duplicate entry", message: "generic error" };
      expect(formatErrorMessage(err)).toBe("Duplicate entry");
    });

    test("returns message when sqlMessage is absent", () => {
      const err = new Error("something broke");
      expect(formatErrorMessage(err)).toBe("something broke");
    });

    test("falls back to toString when message is absent", () => {
      const err = { toString: () => "custom toString" };
      expect(formatErrorMessage(err)).toBe("custom toString");
    });

    test("returns fallback when err is null", () => {
      expect(formatErrorMessage(null)).toBe("Internal Server Error");
    });

    test("returns fallback when err is undefined", () => {
      expect(formatErrorMessage(undefined)).toBe("Internal Server Error");
    });

    test("returns custom fallback string", () => {
      expect(formatErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
    });

    test("returns message from a plain string error", () => {
      // A string has .toString() so it returns itself
      expect(formatErrorMessage("raw string error")).toBe("raw string error");
    });

    test("prefers sqlMessage over message", () => {
      const err = { sqlMessage: "SQL specific", message: "generic" };
      expect(formatErrorMessage(err)).toBe("SQL specific");
    });

    test("unwraps AggregateError causes instead of returning 'AggregateError'", () => {
      // AggregateError is ES2021; the project targets ES2020, so reach it off globalThis.
      const AggregateErrorCtor = (globalThis as any).AggregateError;
      const err = new AggregateErrorCtor(
        [new Error("connect ECONNREFUSED ::1:33062"), new Error("connect ECONNREFUSED 127.0.0.1:33062")],
        "",
      );
      expect(formatErrorMessage(err)).toBe("connect ECONNREFUSED ::1:33062; connect ECONNREFUSED 127.0.0.1:33062");
    });

    test("dedupes identical AggregateError causes", () => {
      const AggregateErrorCtor = (globalThis as any).AggregateError;
      const err = new AggregateErrorCtor([new Error("connect ETIMEDOUT"), new Error("connect ETIMEDOUT")], "");
      expect(formatErrorMessage(err)).toBe("connect ETIMEDOUT");
    });

    test("falls back to the aggregate code when causes carry no message", () => {
      const err = { errors: [{}, {}], code: "ECONNREFUSED", syscall: "connect" };
      expect(formatErrorMessage(err)).toBe("ECONNREFUSED (connect)");
    });

    test("returns the error field of an API error payload", () => {
      expect(formatErrorMessage({ error: "Connection test failed" })).toBe("Connection test failed");
    });

    test("unwraps a nested error object in an adapter result", () => {
      expect(formatErrorMessage({ ok: false, error: new Error("syntax error") })).toBe("syntax error");
    });

    test("returns the code for a messageless system error", () => {
      expect(formatErrorMessage({ code: "ETIMEDOUT" })).toBe("ETIMEDOUT");
    });

    test("prefers message over the code", () => {
      expect(formatErrorMessage({ message: "boom", code: "ECONNRESET" })).toBe("boom");
    });
  });

  describe("safeDisconnect", () => {
    test("calls disconnect on the engine", async () => {
      const engine = { disconnect: vi.fn().mockResolvedValue(undefined) };
      await safeDisconnect(engine);
      expect(engine.disconnect).toHaveBeenCalled();
    });

    test("does not throw when disconnect rejects", async () => {
      const engine = { disconnect: vi.fn().mockRejectedValue(new Error("fail")) };
      await expect(safeDisconnect(engine)).resolves.toBeUndefined();
    });
  });

  describe("backfillTimestamps", () => {
    test("returns false when all items have timestamps", () => {
      const items = [{ id: "1", createdAt: 100, updatedAt: 200 }];
      expect(backfillTimestamps(items, "test")).toBe(false);
    });

    test("backfills missing createdAt and updatedAt", () => {
      const items = [{ id: "1" } as any];
      const result = backfillTimestamps(items, "test");
      expect(result).toBe(true);
      expect(items[0].createdAt).toBeGreaterThan(0);
      expect(items[0].updatedAt).toBeGreaterThan(0);
    });

    test("backfills only missing updatedAt when createdAt exists", () => {
      const items = [{ id: "1", createdAt: 100 } as any];
      const result = backfillTimestamps(items, "test");
      expect(result).toBe(true);
      expect(items[0].createdAt).toBe(100);
      expect(items[0].updatedAt).toBeGreaterThan(0);
    });

    test("backfills only missing createdAt when updatedAt exists", () => {
      const items = [{ id: "1", updatedAt: 200 } as any];
      const result = backfillTimestamps(items, "test");
      expect(result).toBe(true);
      expect(items[0].createdAt).toBeGreaterThan(0);
      expect(items[0].updatedAt).toBe(200);
    });

    test("handles empty array", () => {
      expect(backfillTimestamps([], "test")).toBe(false);
    });

    test("handles mixed items with and without timestamps", () => {
      const items = [{ id: "1", createdAt: 100, updatedAt: 200 }, { id: "2" } as any];
      const result = backfillTimestamps(items, "test");
      expect(result).toBe(true);
      expect(items[0].createdAt).toBe(100);
      expect(items[0].updatedAt).toBe(200);
      expect(items[1].createdAt).toBeGreaterThan(0);
      expect(items[1].updatedAt).toBeGreaterThan(0);
    });
  });
});
