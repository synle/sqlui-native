import { describe, test, expect, vi } from "vitest";
import {
  cancelExecution,
  isValidExecutionId,
  registerExecution,
  unregisterExecution,
} from "src/common/utils/inFlightExecutions";

const fakeEngine = (cancel?: () => Promise<boolean>): any => ({ cancel });

describe("inFlightExecutions", () => {
  test("isValidExecutionId accepts uuid-like ids and rejects everything else", () => {
    expect(isValidExecutionId("3f2a9c1e-0b7d-4e8a-9c3f-1a2b3c4d5e6f")).toBe(true);
    expect(isValidExecutionId("")).toBe(false);
    expect(isValidExecutionId("a/b")).toBe(false);
    expect(isValidExecutionId("x".repeat(65))).toBe(false);
    expect(isValidExecutionId(42)).toBe(false);
    expect(isValidExecutionId(undefined)).toBe(false);
  });

  test("cancels a registered execution through the adapter", async () => {
    const cancel = vi.fn(async () => true);
    registerExecution("conn1", "exec1", fakeEngine(cancel));
    expect(await cancelExecution("conn1", "exec1")).toBe("cancelled");
    expect(cancel).toHaveBeenCalledTimes(1);
    unregisterExecution("conn1", "exec1");
  });

  test("returns not_found after unregister and for another connection's id", async () => {
    registerExecution("conn1", "exec2", fakeEngine(async () => true));
    expect(await cancelExecution("conn2", "exec2")).toBe("not_found");
    unregisterExecution("conn1", "exec2");
    expect(await cancelExecution("conn1", "exec2")).toBe("not_found");
  });

  test("returns unsupported when the adapter has no cancel", async () => {
    registerExecution("conn1", "exec3", fakeEngine());
    expect(await cancelExecution("conn1", "exec3")).toBe("unsupported");
    unregisterExecution("conn1", "exec3");
  });

  test("returns idle when the adapter had nothing running", async () => {
    registerExecution("conn1", "exec4", fakeEngine(async () => false));
    expect(await cancelExecution("conn1", "exec4")).toBe("idle");
    unregisterExecution("conn1", "exec4");
  });
});
