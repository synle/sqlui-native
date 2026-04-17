// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, test, expect, beforeEach } from "vitest";
import React from "react";

let invalidateResolved = false;
let mutateResolved = false;

const mockInvalidateQueries = vi.fn(() => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      invalidateResolved = true;
      resolve();
    }, 50);
  });
});

vi.mock("src/frontend/data/api", () => ({
  ProxyApi: {
    createManagedDatabase: vi.fn(() => Promise.resolve({ id: "db-1", name: "Folder" })),
    deleteManagedDatabase: vi.fn(() => Promise.resolve()),
    updateManagedDatabase: vi.fn(() => Promise.resolve({ id: "db-1", name: "Renamed" })),
    createManagedTable: vi.fn(() => Promise.resolve({ id: "tbl-1", name: "GET Request" })),
    deleteManagedTable: vi.fn(() => Promise.resolve()),
    updateManagedTable: vi.fn(() => Promise.resolve({ id: "tbl-1", name: "Updated" })),
  },
}));

import {
  useCreateManagedDatabase,
  useDeleteManagedDatabase,
  useUpdateManagedDatabase,
  useCreateManagedTable,
  useDeleteManagedTable,
  useUpdateManagedTable,
} from "src/frontend/hooks/useManagedMetadata";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.invalidateQueries = mockInvalidateQueries as any;
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useManagedMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateResolved = false;
    mutateResolved = false;
  });

  describe("useCreateManagedTable", () => {
    test("mutateAsync waits for invalidateQueries to complete before resolving", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateManagedTable(), { wrapper });

      await act(async () => {
        const promise = result.current.mutateAsync({
          connectionId: "c1",
          databaseId: "db1",
          name: "GET Request",
        });
        promise.then(() => {
          mutateResolved = true;
        });
        await promise;
      });

      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(invalidateResolved).toBe(true);
      expect(mutateResolved).toBe(true);
    });
  });

  describe("useDeleteManagedTable", () => {
    test("mutateAsync waits for invalidateQueries to complete", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteManagedTable(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          connectionId: "c1",
          databaseId: "db1",
          managedTableId: "tbl-1",
        });
      });

      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(invalidateResolved).toBe(true);
    });
  });

  describe("useUpdateManagedTable", () => {
    test("mutateAsync waits for invalidateQueries to complete", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateManagedTable(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          connectionId: "c1",
          databaseId: "db1",
          managedTableId: "tbl-1",
          body: { name: "Updated" },
        });
      });

      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(invalidateResolved).toBe(true);
    });
  });

  describe("useCreateManagedDatabase", () => {
    test("mutateAsync waits for invalidateQueries to complete", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useCreateManagedDatabase(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ connectionId: "c1", name: "New Folder" });
      });

      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(invalidateResolved).toBe(true);
    });
  });

  describe("useDeleteManagedDatabase", () => {
    test("mutateAsync waits for invalidateQueries to complete", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useDeleteManagedDatabase(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ connectionId: "c1", managedDatabaseId: "db-1" });
      });

      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(invalidateResolved).toBe(true);
    });
  });

  describe("useUpdateManagedDatabase", () => {
    test("mutateAsync waits for invalidateQueries to complete", async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useUpdateManagedDatabase(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          connectionId: "c1",
          managedDatabaseId: "db-1",
          body: { name: "Renamed Folder" },
        });
      });

      expect(mockInvalidateQueries).toHaveBeenCalled();
      expect(invalidateResolved).toBe(true);
    });
  });
});
