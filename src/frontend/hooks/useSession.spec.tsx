// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("src/frontend/data/api", () => ({
  default: {
    getSessions: vi.fn().mockResolvedValue([]),
    getSession: vi.fn().mockResolvedValue({ id: "s1", name: "Test" }),
    getOpenedSessionIds: vi.fn().mockResolvedValue([]),
    setOpenSession: vi.fn().mockResolvedValue({}),
    upsertSession: vi.fn().mockResolvedValue({ id: "s1", name: "Test" }),
    cloneSession: vi.fn().mockResolvedValue({ id: "s2", name: "Clone" }),
    deleteSession: vi.fn().mockResolvedValue("s1"),
    getConnectionsBySessionId: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("src/frontend/data/session", () => ({
  setCurrentSessionId: vi.fn(),
}));

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ alert: vi.fn(), dismiss: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useFolderItems", () => ({
  useAddRecycleBinItem: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  useIsSoftDeleteModeSetting: () => false,
}));

vi.mock("src/frontend/utils/commonUtils", () => ({
  useNavigate: () => vi.fn(),
}));

import {
  useGetSessions,
  useGetOpenedSessionIds,
  useGetCurrentSession,
  useUpsertSession,
  useCloneSession,
  useDeleteSession,
} from "src/frontend/hooks/useSession";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useSession", () => {
  test("useGetSessions returns data property", async () => {
    const { result } = renderHook(() => useGetSessions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  test("useGetOpenedSessionIds returns data property", async () => {
    const { result } = renderHook(() => useGetOpenedSessionIds(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  test("useGetCurrentSession returns data property", async () => {
    const { result } = renderHook(() => useGetCurrentSession(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  test("useUpsertSession returns mutateAsync", () => {
    const { result } = renderHook(() => useUpsertSession(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });

  test("useCloneSession returns mutateAsync", () => {
    const { result } = renderHook(() => useCloneSession(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });

  test("useDeleteSession returns mutateAsync", () => {
    const { result } = renderHook(() => useDeleteSession(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});
