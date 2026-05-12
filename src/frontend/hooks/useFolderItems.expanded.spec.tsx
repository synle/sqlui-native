/** @vitest-environment jsdom */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("src/frontend/data/api", () => ({
  default: {
    getFolderItems: vi.fn().mockResolvedValue([]),
    addFolderItem: vi.fn().mockResolvedValue(undefined),
    deleteFolderItem: vi.fn().mockResolvedValue(undefined),
    updateFolderItem: vi.fn().mockResolvedValue(undefined),
    upsertFolderItem: vi.fn().mockResolvedValue(undefined),
    upsertConnectionForSession: vi.fn().mockResolvedValue(undefined),
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
  useUpsertConnection: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: "new-1" }) }),
}));

vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useConnectionQueries: () => ({ onAddQuery: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("src/frontend/hooks/useSession", () => ({
  useUpsertSession: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: "sess-1" }) }),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  useIsSoftDeleteModeSetting: () => false,
}));

import dataApi from "src/frontend/data/api";
import {
  useAddRecycleBinItem,
  useAddBookmarkItem,
  useDeleteBookmarkItem,
  useUpdateBookmarkItem,
  useImportBookmarkItem,
  useRestoreRecycleBinItem,
  useDeletedRecycleBinItem,
  useUpdateRecycleBinItem,
} from "src/frontend/hooks/useFolderItems";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useFolderItems extra mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("useAddRecycleBinItem POSTs into recycleBin", async () => {
    const { result } = renderHook(() => useAddRecycleBinItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "n", type: "Connection", data: {} } as any);
    });
    expect(dataApi.addFolderItem).toHaveBeenCalledWith("recycleBin", expect.any(Object));
  });

  test("useDeletedRecycleBinItem deletes from recycleBin", async () => {
    const { result } = renderHook(() => useDeletedRecycleBinItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("the-id");
    });
    expect(dataApi.deleteFolderItem).toHaveBeenCalledWith("recycleBin", "the-id");
  });

  test("useUpdateRecycleBinItem updates recycleBin", async () => {
    const { result } = renderHook(() => useUpdateRecycleBinItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "1", name: "n", type: "Connection", data: {} } as any);
    });
    expect(dataApi.updateFolderItem).toHaveBeenCalledWith("recycleBin", expect.any(Object));
  });

  test("useAddBookmarkItem POSTs into bookmarks", async () => {
    const { result } = renderHook(() => useAddBookmarkItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "b", type: "Connection", data: {} } as any);
    });
    expect(dataApi.addFolderItem).toHaveBeenCalledWith("bookmarks", expect.any(Object));
  });

  test("useDeleteBookmarkItem deletes by id from bookmarks", async () => {
    const { result } = renderHook(() => useDeleteBookmarkItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("bm");
    });
    expect(dataApi.deleteFolderItem).toHaveBeenCalledWith("bookmarks", "bm");
  });

  test("useUpdateBookmarkItem updates bookmarks", async () => {
    const { result } = renderHook(() => useUpdateBookmarkItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "x", name: "n", type: "Connection", data: {} } as any);
    });
    expect(dataApi.updateFolderItem).toHaveBeenCalledWith("bookmarks", expect.any(Object));
  });

  test("useImportBookmarkItem upserts", async () => {
    const { result } = renderHook(() => useImportBookmarkItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "x", name: "n", type: "Connection", data: {} } as any);
    });
    expect(dataApi.upsertFolderItem).toHaveBeenCalledWith("bookmarks", expect.any(Object));
  });

  test("useRestoreRecycleBinItem — Connection branch calls upsert + delete", async () => {
    const { result } = renderHook(() => useRestoreRecycleBinItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "x", name: "c", type: "Connection", data: { name: "c", connection: "mysql://x" } } as any);
    });
    expect(dataApi.deleteFolderItem).toHaveBeenCalledWith("recycleBin", "x");
  });

  test("useRestoreRecycleBinItem — Query branch", async () => {
    const { result } = renderHook(() => useRestoreRecycleBinItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: "y", name: "q", type: "Query", data: { name: "q", sql: "SELECT 1" } } as any);
    });
    expect(dataApi.deleteFolderItem).toHaveBeenCalledWith("recycleBin", "y");
  });

  test("useRestoreRecycleBinItem — Session branch with connections restores each", async () => {
    const { result } = renderHook(() => useRestoreRecycleBinItem(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        id: "z",
        name: "s",
        type: "Session",
        data: { name: "s" },
        connections: [
          { name: "c1", connection: "mysql://1" },
          { name: "c2", connection: "mysql://2" },
        ],
      } as any);
    });
    expect(dataApi.upsertConnectionForSession).toHaveBeenCalledTimes(2);
    expect(dataApi.deleteFolderItem).toHaveBeenCalledWith("recycleBin", "z");
  });
});
