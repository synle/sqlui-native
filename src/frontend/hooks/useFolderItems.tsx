import { useQuery } from 'react-query';
import dataApi from 'src/frontend/data/api';
import { SqluiCore } from 'typings';

const QUERY_KEY_FOLDER_ITEMS = 'folderItems';

const DEFAULT_STALE_TIME = 30000;

export function useGetFolderItems(folderType: SqluiCore.FolderType) {
  return useQuery<SqluiCore.FolderItem[], void, SqluiCore.FolderType>(
    [QUERY_KEY_FOLDER_ITEMS],
    async () => dataApi.getFolderItems(folderType),
  );
}
