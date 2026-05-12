/** @vitest-environment jsdom */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("src/frontend/data/api", () => ({
  default: {
    getConnectionDatabases: vi.fn().mockResolvedValue([{ name: "db1", tables: [] }]),
    getConnectionTables: vi.fn().mockResolvedValue([
      { name: "t1", columns: [] },
      { name: "t2", columns: [] },
    ]),
    getConnectionColumns: vi.fn().mockResolvedValue([{ name: "id", type: "int" }]),
    getCachedSchema: vi.fn().mockResolvedValue({ databases: [], tables: [], columns: {} }),
  },
}));

import dataApi from "src/frontend/data/api";
import { useGetDatabases, useGetTables, useGetCachedSchema, useGetAllTableColumns, useGetColumns } from "src/frontend/hooks/useSchema";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useSchema hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("useGetDatabases fetches when connectionId provided", async () => {
    const { result } = renderHook(() => useGetDatabases("c1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(dataApi.getConnectionDatabases).toHaveBeenCalledWith("c1");
  });

  test("useGetDatabases disabled when no connectionId", () => {
    const { result } = renderHook(() => useGetDatabases(undefined), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(dataApi.getConnectionDatabases).not.toHaveBeenCalled();
  });

  test("useGetTables fetches when both ids provided", async () => {
    const { result } = renderHook(() => useGetTables("c1", "db1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(dataApi.getConnectionTables).toHaveBeenCalledWith("c1", "db1");
  });

  test("useGetTables disabled when either id missing", () => {
    const { result } = renderHook(() => useGetTables("c1", undefined), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  test("useGetCachedSchema fetches the consolidated schema", async () => {
    const { result } = renderHook(() => useGetCachedSchema("c1", "db1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(dataApi.getCachedSchema).toHaveBeenCalledWith("c1", "db1");
  });

  test("useGetCachedSchema disabled when missing ids", () => {
    const { result } = renderHook(() => useGetCachedSchema(undefined, undefined), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  test("useGetAllTableColumns fetches tables then per-table columns", async () => {
    const { result } = renderHook(() => useGetAllTableColumns("c1", "db1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(dataApi.getConnectionTables).toHaveBeenCalledWith("c1", "db1");
    // both tables hit
    expect(dataApi.getConnectionColumns).toHaveBeenCalledTimes(2);
  });

  test("useGetAllTableColumns returns empty when disabled", async () => {
    const { result } = renderHook(() => useGetAllTableColumns(undefined, "db1"), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });

  test("useGetColumns fetches when all three ids present", async () => {
    const { result } = renderHook(() => useGetColumns("c1", "db1", "t1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(dataApi.getConnectionColumns).toHaveBeenCalledWith("c1", "db1", "t1");
  });

  test("useGetColumns disabled when any id missing", () => {
    const { result } = renderHook(() => useGetColumns("c1", "db1", undefined), { wrapper });
    expect(result.current.isLoading).toBe(false);
  });
});
