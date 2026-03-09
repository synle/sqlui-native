import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "src/frontend/utils/commonUtils";
import dataApi from "src/frontend/data/api";
import { useCommands } from "src/frontend/components/MissionControl";
import { useUpsertConnection } from "src/frontend/hooks/useConnection";
import { useConnectionQueries } from "src/frontend/hooks/useConnectionQuery";
import { useUpsertSession } from "src/frontend/hooks/useSession";
import { SqluiCore } from "typings";

/** React Query cache key for folder items. */
const QUERY_KEY_FOLDER_ITEMS = "folderItems";
/** Folder type identifier for the recycle bin. */
const FOLDER_TYPE_RECYCLE_BIN = "recycleBin";
/** Folder type identifier for bookmarks. */
const FOLDER_TYPE_BOOKMARKS = "bookmarks";

/**
 * Hook to fetch folder items by folder type.
 * @param folderType - The type of folder (e.g., recycleBin, bookmarks).
 * @returns React Query result containing an array of folder items.
 */
export function useGetFolderItems(folderType: SqluiCore.FolderType) {
  return useQuery<SqluiCore.FolderItem[], void, SqluiCore.FolderItem[]>(
    [QUERY_KEY_FOLDER_ITEMS, folderType],
    async () => dataApi.getFolderItems(folderType),
    {
      notifyOnChangeProps: ["data", "error"],
    },
  );
}

/**
 * Hook to add a new folder item to a specified folder type.
 * @param folderType - The type of folder to add the item to.
 * @returns Mutation that accepts a folder item (without ID) to add.
 */
export function useAddFolderItem(folderType: SqluiCore.FolderType) {
  const queryClient = useQueryClient();

  return useMutation<void, void, Omit<SqluiCore.FolderItem, "id">>(
    async (folderItem) => {
      await dataApi.addFolderItem(folderType, folderItem);
    },
    {
      onSuccess: async () => {
        queryClient.invalidateQueries([QUERY_KEY_FOLDER_ITEMS, folderType]);
      },
    },
  );
}

/**
 * Hook to update an existing folder item in a specified folder type.
 * @param folderType - The type of folder containing the item.
 * @returns Mutation that accepts a folder item to update.
 */
export function useUpdateFolderItem(folderType: SqluiCore.FolderType) {
  const queryClient = useQueryClient();

  return useMutation<void, void, SqluiCore.FolderItem>(
    async (folderItem) => {
      await dataApi.updateFolderItem(folderType, folderItem);
    },
    {
      onSuccess: async () => {
        queryClient.invalidateQueries([QUERY_KEY_FOLDER_ITEMS, folderType]);
      },
    },
  );
}

/**
 * Hook to delete a folder item by ID from a specified folder type.
 * @param folderType - The type of folder containing the item.
 * @returns Mutation that accepts an item ID to delete.
 */
export function useDeleteFolderItem(folderType: SqluiCore.FolderType) {
  const queryClient = useQueryClient();

  return useMutation<void, void, string>(
    async (itemId) => {
      await dataApi.deleteFolderItem(folderType, itemId);
    },
    {
      onSuccess: async () => {
        queryClient.invalidateQueries([QUERY_KEY_FOLDER_ITEMS, folderType]);
      },
    },
  );
}

/** Hook to fetch all items in the recycle bin. */
export function useGetRecycleBinItems() {
  return useGetFolderItems(FOLDER_TYPE_RECYCLE_BIN);
}

/** Hook to add an item to the recycle bin. */
export function useAddRecycleBinItem() {
  return useAddFolderItem(FOLDER_TYPE_RECYCLE_BIN);
}

/** Hook to permanently delete an item from the recycle bin. */
export function useDeletedRecycleBinItem() {
  return useDeleteFolderItem(FOLDER_TYPE_RECYCLE_BIN);
}

/** Hook to update an item in the recycle bin. */
export function useUpdateRecycleBinItem() {
  return useUpdateFolderItem(FOLDER_TYPE_RECYCLE_BIN);
}

/**
 * Hook to restore a recycle bin item (Connection, Query, or Session) back to active use.
 * Removes the item from the recycle bin after restoring.
 * @returns Mutation that accepts a folder item to restore.
 */
export function useRestoreRecycleBinItem() {
  const navigate = useNavigate();
  const { mutateAsync: upsertConnection } = useUpsertConnection();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { mutateAsync: deleteRecyleBinItem } = useDeletedRecycleBinItem();
  const { onAddQuery } = useConnectionQueries();
  const { selectCommand } = useCommands();

  return useMutation<void, void, SqluiCore.FolderItem>(async (folderItem) => {
    // here we handle restorable
    switch (folderItem.type) {
      case "Connection":
        await Promise.all([upsertConnection(folderItem.data), deleteRecyleBinItem(folderItem.id)]);
        navigate("/"); // navigate back to the main page
        break;
      case "Query":
        // TODO: add check and handle restore of related connection
        await Promise.all([onAddQuery(folderItem.data), deleteRecyleBinItem(folderItem.id)]);
        navigate("/"); // navigate back to the main page
        break;
      case "Session": {
        // restore the session record
        const restoredSession = await upsertSession(folderItem.data);

        // restore associated connections to the session
        if (folderItem.connections?.length) {
          await Promise.all(folderItem.connections.map((connection) => dataApi.upsertConnectionForSession(restoredSession.id, connection)));
        }

        await deleteRecyleBinItem(folderItem.id);
        selectCommand({ event: "clientEvent/session/switch" });
        navigate("/"); // navigate back to the main page
        break;
      }
    }
  });
}

/** Hook to fetch all bookmark items. */
export function useGetBookmarkItems() {
  return useGetFolderItems(FOLDER_TYPE_BOOKMARKS);
}

/** Hook to add a new bookmark item. */
export function useAddBookmarkItem() {
  return useAddFolderItem(FOLDER_TYPE_BOOKMARKS);
}

/** Hook to delete a bookmark item by ID. */
export function useDeleteBookmarkItem() {
  return useDeleteFolderItem(FOLDER_TYPE_BOOKMARKS);
}

/** Hook to update an existing bookmark item. */
export function useUpdateBookmarkItem() {
  return useUpdateFolderItem(FOLDER_TYPE_BOOKMARKS);
}
