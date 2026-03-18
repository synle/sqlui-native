// @vitest-environment jsdom
import { refreshAfterExecution } from "src/frontend/hooks/useConnection";
import { vi } from "vitest";

describe("refreshAfterExecution", () => {
  test("does not throw when query is falsy", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    expect(() => refreshAfterExecution(undefined as any, queryClient)).not.toThrow();
  });

  test("does not invalidate for DDL keywords (no-op)", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", sql: "DROP TABLE users" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test("does not invalidate for a simple SELECT query", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", sql: "SELECT * FROM users" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
