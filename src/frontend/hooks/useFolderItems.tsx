import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import dataApi from 'src/frontend/data/api';
import { useUpsertConnection } from 'src/frontend/hooks/useConnection';
import { useConnectionQueries } from 'src/frontend/hooks/useConnectionQuery';
import { SqluiCore } from 'typings';

const QUERY_KEY_FOLDER_ITEMS = 'folderItems';
const FOLDER_TYPE_RECYCLE_BIN = 'recycleBin';
const FOLDER_TYPE_BOOKMARKS = 'bookmarks';

export function useGetFolderItems(folderType: SqluiCore.FolderType) {
  return useQuery<SqluiCore.FolderItem[], void, SqluiCore.FolderItem[]>(
    [QUERY_KEY_FOLDER_ITEMS, folderType],
    async () => dataApi.getFolderItems(folderType),
    {

    },
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

export function useUpdateRecycleBinItem() {
  return useUpdateFolderItem(FOLDER_TYPE_RECYCLE_BIN);
}

export function useRestoreRecycleBinItem() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { mutateAsync: upsertConnection } = useUpsertConnection();
  const { mutateAsync: deleteRecyleBinItem } = useDeletedRecycleBinItem();
  const { onAddQuery } = useConnectionQueries();

  return useMutation<void, void, SqluiCore.FolderItem>(async (folderItem) => {
    // here we handle restorable
    switch (folderItem.type) {
      case 'Connection':
        await Promise.all([upsertConnection(folderItem.data), deleteRecyleBinItem(folderItem.id)]);
        navigate('/'); // navigate back to the main page
        break;
      case 'Query':
        // TODO: add check and handle restore of related connection
        await Promise.all([onAddQuery(folderItem.data), deleteRecyleBinItem(folderItem.id)]);
        navigate('/'); // navigate back to the main page
        break;
    }
  });
}

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

export function useUpdateBookmarkItem() {
  return useUpdateFolderItem(FOLDER_TYPE_BOOKMARKS);
}
