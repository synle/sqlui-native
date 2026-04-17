// @vitest-environment jsdom
import { vi } from "vitest";

vi.mock("src/frontend/monacoSetup", () => ({
  monaco: {},
  default: {},
}));

import { refreshAfterExecution } from "src/frontend/hooks/useConnection";

describe("refreshAfterExecution", () => {
  test("does not throw when query is falsy", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    expect(() => refreshAfterExecution(undefined as any, queryClient)).not.toThrow();
  });

  test("does not invalidate when connectionId is missing", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { databaseId: "db1", sql: "SELECT 1" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test("does not invalidate when databaseId is missing", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", sql: "SELECT 1" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test("invalidates schema caches when both connectionId and databaseId are present", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", databaseId: "db1", sql: "CREATE TABLE foo (id INT)" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
  });

  test("invalidates for SELECT queries too (lightweight background refresh)", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", databaseId: "db1", sql: "SELECT * FROM users" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });
});
