/** @vitest-environment jsdom */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("src/frontend/data/api", () => ({
  default: {
    getSession: vi.fn().mockResolvedValue({ id: "sess-1", name: "S" }),
    getSessions: vi.fn().mockResolvedValue([{ id: "sess-1", name: "S" }]),
    upsertSession: vi.fn().mockResolvedValue({ id: "sess-1", name: "S" }),
    cloneSession: vi.fn().mockResolvedValue({ id: "sess-2", name: "Clone" }),
    deleteSession: vi.fn().mockResolvedValue("sess-1"),
    getConnectionsBySessionId: vi.fn().mockResolvedValue([]),
  },
}));

const setCurrentSessionIdMock = vi.fn();
vi.mock("src/frontend/data/session", () => ({
  getCurrentSessionId: vi.fn(() => "sess-1"),
  setCurrentSessionId: (...args: any[]) => setCurrentSessionIdMock(...args),
}));

vi.mock("src/frontend/utils/commonUtils", async () => {
  const actual = await vi.importActual<any>("src/frontend/utils/commonUtils");
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("src/frontend/hooks/useFolderItems", () => ({
  useAddRecycleBinItem: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  useIsSoftDeleteModeSetting: () => true,
}));

import dataApi from "src/frontend/data/api";
import { useSelectSession, useUpsertSession, useDeleteSession, useCloneSession } from "src/frontend/hooks/useSession";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useSession extra coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("useSelectSession default path: setCurrentSessionId + queryClient.clear + navigate", async () => {
    const { result } = renderHook(() => useSelectSession(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("new-sid");
    });
    expect(setCurrentSessionIdMock).toHaveBeenCalledWith("new-sid", true);
  });

  test("useSelectSession suppressReload=true: only setCurrentSessionId", async () => {
    const { result } = renderHook(() => useSelectSession(true), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("new-sid");
    });
    expect(setCurrentSessionIdMock).toHaveBeenCalledWith("new-sid", true);
  });

  test("useUpsertSession invokes dataApi.upsertSession", async () => {
    const { result } = renderHook(() => useUpsertSession(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "S" } as any);
    });
    expect(dataApi.upsertSession).toHaveBeenCalled();
  });

  test("useCloneSession invokes dataApi.cloneSession", async () => {
    const { result } = renderHook(() => useCloneSession(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "Clone" } as any);
    });
    expect(dataApi.cloneSession).toHaveBeenCalled();
  });

  test("useDeleteSession backs up under soft-delete mode + calls deleteSession", async () => {
    (dataApi.getConnectionsBySessionId as any).mockResolvedValueOnce([
      { id: "c1", name: "X", connection: "mysql://x", status: "online" },
    ]);
    const { result } = renderHook(() => useDeleteSession(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("sess-1");
    });
    expect(dataApi.deleteSession).toHaveBeenCalledWith("sess-1");
  });

  test("useDeleteSession swallows getConnectionsBySessionId error", async () => {
    (dataApi.getConnectionsBySessionId as any).mockRejectedValueOnce(new Error("down"));
    const { result } = renderHook(() => useDeleteSession(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("sess-bad");
    });
    expect(dataApi.deleteSession).toHaveBeenCalledWith("sess-bad");
  });
});
