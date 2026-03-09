// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("src/frontend/data/api", () => ({
  default: {
    getFolderItems: vi.fn().mockResolvedValue([]),
    addFolderItem: vi.fn().mockResolvedValue(undefined),
    updateFolderItem: vi.fn().mockResolvedValue(undefined),
    deleteFolderItem: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("src/frontend/utils/commonUtils", () => ({
  useNavigate: () => vi.fn(),
  getGeneratedRandomId: (prefix: string) => `${prefix}_123`,
  getUpdatedOrdersForList: (list: any[]) => list,
}));

vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useConnection", () => ({
  useUpsertConnection: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useConnectionQueries: () => ({ onAddQuery: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useSession", () => ({
  useUpsertSession: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: "s1" }) }),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  useIsSoftDeleteModeSetting: () => false,
}));

import {
  useGetFolderItems,
  useAddFolderItem,
  useDeleteFolderItem,
  useUpdateFolderItem,
  useGetRecycleBinItems,
  useGetBookmarkItems,
} from "src/frontend/hooks/useFolderItems";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useFolderItems", () => {
  test("useGetFolderItems returns data property", async () => {
    const { result } = renderHook(() => useGetFolderItems("recycleBin"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  test("useAddFolderItem returns mutateAsync", () => {
    const { result } = renderHook(() => useAddFolderItem("recycleBin"), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutateAsync).toBeDefined();
  });

  test("useDeleteFolderItem returns mutateAsync", () => {
    const { result } = renderHook(() => useDeleteFolderItem("bookmarks"), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutateAsync).toBeDefined();
  });

  test("useUpdateFolderItem returns mutateAsync", () => {
    const { result } = renderHook(() => useUpdateFolderItem("bookmarks"), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutateAsync).toBeDefined();
  });

  test("useGetRecycleBinItems returns data property", async () => {
    const { result } = renderHook(() => useGetRecycleBinItems(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  test("useGetBookmarkItems returns data property", async () => {
    const { result } = renderHook(() => useGetBookmarkItems(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });
});
