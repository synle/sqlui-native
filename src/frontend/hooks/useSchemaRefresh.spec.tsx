/** @vitest-environment jsdom */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("src/frontend/data/api", () => ({
  default: {
    refreshConnection: vi.fn().mockResolvedValue({ id: "c1", status: "online" }),
    refreshDatabase: vi.fn().mockResolvedValue(undefined),
    refreshTable: vi.fn().mockResolvedValue(undefined),
  },
}));

import dataApi from "src/frontend/data/api";
import {
  invalidateSchemaForDatabase,
  invalidateSchemaForTable,
  useRetryConnection,
  useRefreshDatabase,
  useRefreshTable,
} from "src/frontend/hooks/useSchemaRefresh";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useSchemaRefresh helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("invalidateSchemaForDatabase calls invalidateQueries multiple times", () => {
    const qc = { invalidateQueries: vi.fn() } as any;
    invalidateSchemaForDatabase(qc, "c1", "db1");
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(4);
  });

  test("invalidateSchemaForTable calls invalidateQueries 3 times", () => {
    const qc = { invalidateQueries: vi.fn() } as any;
    invalidateSchemaForTable(qc, "c1", "db1", "t1");
    expect(qc.invalidateQueries).toHaveBeenCalledTimes(3);
  });

  test("useRetryConnection clears caches + refreshes connection", async () => {
    const { result } = renderHook(() => useRetryConnection(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("c1");
    });
    expect(dataApi.refreshConnection).toHaveBeenCalledWith("c1");
  });

  test("useRefreshDatabase invokes the refreshDatabase api + invalidates", async () => {
    const { result } = renderHook(() => useRefreshDatabase(), { wrapper });
    await result.current("c1", "db1");
    expect(dataApi.refreshDatabase).toHaveBeenCalledWith("c1", "db1");
  });

  test("useRefreshTable invokes the refreshTable api + invalidates", async () => {
    const { result } = renderHook(() => useRefreshTable(), { wrapper });
    await result.current("c1", "db1", "t1");
    expect(dataApi.refreshTable).toHaveBeenCalledWith("c1", "db1", "t1");
  });
});
