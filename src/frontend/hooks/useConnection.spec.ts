// @vitest-environment jsdom
import { refreshAfterExecution } from "src/frontend/hooks/useConnection";
import { vi } from "vitest";

describe("refreshAfterExecution", () => {
  test("does not throw when query is falsy", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    expect(() => refreshAfterExecution(undefined as any, queryClient)).not.toThrow();
  });

  test("invalidates queries when sql contains DDL keywords", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", sql: "DROP TABLE users" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });

  test("does not invalidate for a simple SELECT query", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", sql: "SELECT * FROM users" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  test("detects CREATE DATABASE keyword", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", sql: "CREATE DATABASE mydb" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });

  test("detects ALTER TABLE keyword", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", sql: "ALTER TABLE users ADD COLUMN age INT" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });

  test("detects MongoDB .insert command", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", sql: "db.collection.insert({name: 'test'})" } as any;
    refreshAfterExecution(query, queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });
});
