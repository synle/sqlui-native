// @vitest-environment jsdom
import { vi } from "vitest";

vi.mock("src/frontend/monacoSetup", () => ({
  monaco: {},
  default: {},
}));

vi.mock("src/frontend/data/api", () => ({
  default: {
    refreshDatabase: vi.fn(() => Promise.resolve()),
  },
}));

import { refreshAfterExecution } from "src/frontend/hooks/useConnection";
import dataApi from "src/frontend/data/api";

describe("refreshAfterExecution", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("does not throw when query is falsy", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    expect(() => refreshAfterExecution(undefined as any, queryClient)).not.toThrow();
  });

  test("does not call refreshDatabase when connectionId is missing", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { databaseId: "db1", sql: "SELECT 1" } as any;
    refreshAfterExecution(query, queryClient);
    expect(dataApi.refreshDatabase).not.toHaveBeenCalled();
  });

  test("does not call refreshDatabase when databaseId is missing", () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", sql: "SELECT 1" } as any;
    refreshAfterExecution(query, queryClient);
    expect(dataApi.refreshDatabase).not.toHaveBeenCalled();
  });

  test("calls refreshDatabase and invalidates caches when both IDs present", async () => {
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", databaseId: "db1", sql: "CREATE TABLE foo (id INT)" } as any;
    refreshAfterExecution(query, queryClient);
    // Wait for the fire-and-forget promise chain
    await vi.waitFor(() => {
      expect(dataApi.refreshDatabase).toHaveBeenCalledWith("c1", "db1");
      expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(3);
    });
  });

  test("does not throw when refreshDatabase fails", async () => {
    vi.mocked(dataApi.refreshDatabase).mockRejectedValueOnce(new Error("network error"));
    const queryClient = { invalidateQueries: vi.fn() } as any;
    const query = { connectionId: "c1", databaseId: "db1", sql: "SELECT 1" } as any;
    refreshAfterExecution(query, queryClient);
    // Wait for the promise to settle — should not throw
    await new Promise((r) => setTimeout(r, 50));
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
