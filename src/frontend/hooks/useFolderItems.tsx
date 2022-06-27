import { useMutation, useQuery, useQueryClient } from 'react-query';
import dataApi from 'src/frontend/data/api';
import { SqluiCore } from 'typings';

const QUERY_KEY_FOLDER_ITEMS = 'folderItems';
const FOLDER_TYPE_RECYCLE_BIN = 'recycleBin';
const FOLDER_TYPE_BOOKMARKS = 'bookmarks';

export function useGetFolderItems(folderType: SqluiCore.FolderType) {
  return useQuery<SqluiCore.FolderItem[], void, SqluiCore.FolderItem[]>(
    [QUERY_KEY_FOLDER_ITEMS, folderType],
    async () => dataApi.getFolderItems(folderType),
  );
}

export function useAddFolderItem(folderType: SqluiCore.FolderType) {
  const queryClient = useQueryClient();

  return useMutation<void, void, Omit<SqluiCore.FolderItem, 'id'>>(
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

// recycle bin
export function useGetRecycleBinItems() {
  return useGetFolderItems(FOLDER_TYPE_RECYCLE_BIN);
}

export function useAddRecycleBinItem() {
  return useAddFolderItem(FOLDER_TYPE_RECYCLE_BIN);
}

export function useDeletedRecycleBinItem() {
  return useDeleteFolderItem(FOLDER_TYPE_RECYCLE_BIN);
}

// TODO: will be used to implement bookmarks
// bookmarks folder api
export function useGetBookmarkItems() {
  return useGetFolderItems(FOLDER_TYPE_BOOKMARKS);
}

export function useAddBookmarkItem() {
  return useAddFolderItem(FOLDER_TYPE_BOOKMARKS);
}

export function useDeleteBookmarkItem() {
  return useDeleteFolderItem(FOLDER_TYPE_BOOKMARKS);
}
