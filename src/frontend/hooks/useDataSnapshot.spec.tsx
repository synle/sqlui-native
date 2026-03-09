// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("src/frontend/data/api", () => ({
  default: {
    getDataSnapshots: vi.fn().mockResolvedValue([]),
    getDataSnapshot: vi.fn().mockResolvedValue(null),
    addDataSnapshot: vi.fn().mockResolvedValue({}),
    deleteDataSnapshot: vi.fn().mockResolvedValue(undefined),
  },
}));

import { useGetDataSnapshots, useGetDataSnapshot, useAddDataSnapshot, useDeleteDataSnapshot } from "src/frontend/hooks/useDataSnapshot";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useDataSnapshot", () => {
  test("useGetDataSnapshots returns data property", async () => {
    const { result } = renderHook(() => useGetDataSnapshots(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  test("useGetDataSnapshot returns data property", async () => {
    const { result } = renderHook(() => useGetDataSnapshot("snap1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  test("useAddDataSnapshot returns mutateAsync", () => {
    const { result } = renderHook(() => useAddDataSnapshot(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutateAsync).toBeDefined();
  });

  test("useDeleteDataSnapshot returns mutateAsync", () => {
    const { result } = renderHook(() => useDeleteDataSnapshot(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutateAsync).toBeDefined();
  });
});
