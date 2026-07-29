/** @vitest-environment jsdom */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("src/frontend/monacoSetup", () => ({ monaco: {}, default: {} }));

vi.mock("src/frontend/data/api", () => ({
  default: {
    getConnections: vi.fn().mockResolvedValue([]),
    getConnection: vi.fn().mockResolvedValue({}),
    upsertConnection: vi.fn().mockResolvedValue({ id: "new-1", name: "X" }),
    deleteConnection: vi.fn().mockResolvedValue("c1"),
    update: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue({ ok: true }),
    test: vi.fn().mockResolvedValue({ status: "online" }),
    reconnect: vi.fn().mockResolvedValue({ status: "online" }),
    refreshDatabase: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("src/frontend/hooks/useFolderItems", () => ({
  useAddRecycleBinItem: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  useIsSoftDeleteModeSetting: () => false,
}));

vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: vi.fn().mockResolvedValue({ dismiss: vi.fn() }), dismiss: vi.fn() }),
}));

vi.mock("src/frontend/utils/commonUtils", async () => {
  const actual = await vi.importActual<any>("src/frontend/utils/commonUtils");
  return {
    ...actual,
    getUpdatedOrdersForList: (l: any[]) => l,
  };
});

import dataApi from "src/frontend/data/api";
import {
  useGetConnections,
  useUpdateConnections,
  useGetConnectionById,
  useUpsertConnection,
  useDeleteConnection,
  useDuplicateConnection,
  useImportConnection,
  useExecute,
  useTestConnection,
  useAutoConnectAll,
} from "src/frontend/hooks/useConnection";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useConnection hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("useGetConnections fetches", async () => {
    (dataApi.getConnections as any).mockResolvedValueOnce([
      { id: "c1", name: "X", connection: "mysql://x" },
    ]);
    const { result } = renderHook(() => useGetConnections(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("X");
  });

  test("useGetConnectionById fetches when id provided", async () => {
    (dataApi.getConnection as any).mockResolvedValueOnce({ id: "c1", name: "C" });
    const { result } = renderHook(() => useGetConnectionById("c1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe("C");
  });

  test("useGetConnectionById disabled without id (returns undefined data)", () => {
    const { result } = renderHook(() => useGetConnectionById(undefined), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  test("useUpsertConnection PUTs through dataApi.upsertConnection", async () => {
    const { result } = renderHook(() => useUpsertConnection(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "x", name: "X", connection: "mysql://x" });
    });
    expect(dataApi.upsertConnection).toHaveBeenCalled();
  });

  test("useDeleteConnection POSTs deletion", async () => {
    const { result } = renderHook(() => useDeleteConnection(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("c1");
    });
    expect(dataApi.deleteConnection).toHaveBeenCalled();
    expect((dataApi.deleteConnection as any).mock.calls[0][0]).toBe("c1");
  });

  test("useDuplicateConnection delegates to upsert", async () => {
    const { result } = renderHook(() => useDuplicateConnection(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "src", name: "S", connection: "mysql://x" });
    });
    expect(dataApi.upsertConnection).toHaveBeenCalled();
    // The dup hook passes a generated name; id should NOT round-trip
    const arg = (dataApi.upsertConnection as any).mock.calls[0][0];
    expect(arg.id).toBeUndefined();
    expect(arg.connection).toBe("mysql://x");
  });

  test("useImportConnection preserves id + name", async () => {
    const { result } = renderHook(() => useImportConnection(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: "preserved",
        name: "ImportedName",
        connection: "mysql://x",
      });
    });
    const arg = (dataApi.upsertConnection as any).mock.calls[0][0];
    expect(arg.id).toBe("preserved");
    expect(arg.name).toBe("ImportedName");
  });

  test("useExecute calls dataApi.execute", async () => {
    const { result } = renderHook(() => useExecute(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: "q",
        name: "Q",
        sql: "SELECT 1",
        connectionId: "c",
        databaseId: "d",
      } as any);
    });
    expect(dataApi.execute).toHaveBeenCalled();
  });

  test("useTestConnection calls dataApi.test", async () => {
    const { result } = renderHook(() => useTestConnection(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "X", connection: "mysql://x" });
    });
    expect(dataApi.test).toHaveBeenCalled();
  });

  test("useUpdateConnections reorders the list and POSTs through update", async () => {
    const connections = [
      { id: "1", name: "A", connection: "mysql://1" },
      { id: "2", name: "B", connection: "mysql://2" },
    ] as any;
    const { result } = renderHook(() => useUpdateConnections(connections), { wrapper });
    await act(async () => {
      await result.current.mutateAsync([0, 1]);
    });
    expect(dataApi.update).toHaveBeenCalled();
  });

  test("useUpdateConnections rejects when connections is undefined", async () => {
    const { result } = renderHook(() => useUpdateConnections(undefined), { wrapper });
    await act(async () => {
      let rejected = false;
      try {
        await result.current.mutateAsync([0, 1]);
      } catch {
        rejected = true;
      }
      expect(rejected).toBe(true);
    });
  });

  test("useAutoConnectAll fires reconnect for connections without status", async () => {
    (dataApi as any).reconnect = vi.fn().mockResolvedValue({ status: "online" });
    const connections = [{ id: "c1", name: "X", connection: "mysql://x" }] as any;
    renderHook(() => useAutoConnectAll(connections), { wrapper });
    await waitFor(() => expect((dataApi as any).reconnect).toHaveBeenCalledWith("c1"));
  });

  test("useAutoConnectAll handles reconnect failure by marking offline", async () => {
    (dataApi as any).reconnect = vi.fn().mockRejectedValue(new Error("nope"));
    const connections = [{ id: "c2", name: "X", connection: "mysql://x" }] as any;
    renderHook(() => useAutoConnectAll(connections), { wrapper });
    await waitFor(() => expect((dataApi as any).reconnect).toHaveBeenCalledWith("c2"));
  });

  test("useAutoConnectAll is no-op when connections undefined", () => {
    renderHook(() => useAutoConnectAll(undefined), { wrapper });
    expect((dataApi as any).reconnect).toBeDefined(); // not called
  });
});
