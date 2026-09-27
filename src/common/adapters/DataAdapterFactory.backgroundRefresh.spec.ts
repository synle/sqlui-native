/**
 * Regression coverage for runBackgroundRefresh: a stale-cache refresh must run on its
 * own adapter (never the caller's, which is disconnected immediately), disconnect that
 * adapter only after the work finishes, and dedupe concurrent refreshes by key.
 */
import { vi, describe, test, expect } from "vitest";

vi.mock("node:fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => {
      throw new Error("ENOENT");
    }),
    writeFileSync: vi.fn(),
    renameSync: vi.fn(),
    promises: { writeFile: vi.fn(() => Promise.resolve()) },
  },
}));

import { runBackgroundRefresh } from "src/common/adapters/DataAdapterFactory";

const CONN = "sqlite://:memory:";

describe("runBackgroundRefresh", () => {
  test("disconnects the dedicated adapter only after the work completes", async () => {
    const events: string[] = [];
    await runBackgroundRefresh(
      CONN,
      "bg-order",
      async (engine) => {
        const original = engine.disconnect.bind(engine);
        engine.disconnect = async () => {
          events.push("disconnect");
          await original();
        };
        await new Promise((resolve) => setTimeout(resolve, 5));
        events.push("work-done");
      },
      "test",
    );
    expect(events).toEqual(["work-done", "disconnect"]);
  });

  test("returns undefined for a duplicate key while a refresh is in flight", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const first = runBackgroundRefresh(CONN, "bg-dedupe", () => gate, "test");
    const second = runBackgroundRefresh(CONN, "bg-dedupe", async () => {}, "test");
    expect(first).toBeInstanceOf(Promise);
    expect(second).toBeUndefined();
    release();
    await first;
    const third = runBackgroundRefresh(CONN, "bg-dedupe", async () => {}, "test");
    expect(third).toBeInstanceOf(Promise);
    await third;
  });

  test("swallows and logs work failures without rejecting", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      runBackgroundRefresh(
        CONN,
        "bg-fail",
        async () => {
          throw new Error("boom");
        },
        "labelX",
      ),
    ).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith("DataAdapterFactory.ts:labelX", expect.any(Error));
    spy.mockRestore();
  });
});
