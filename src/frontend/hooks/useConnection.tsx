import { QueryClient, useMutation, useQuery, useQueryClient } from 'react-query';
import dataApi from 'src/frontend/data/api';
import { useAddRecycleBinItem } from 'src/frontend/hooks/useFolderItems';
import { useIsSoftDeleteModeSetting } from 'src/frontend/hooks/useSetting';
import { getUpdatedOrdersForList } from 'src/frontend/utils/commonUtils';
import { SqluiCore, SqluiFrontend } from 'typings';

const QUERY_KEY_ALL_CONNECTIONS = 'connections';

const DEFAULT_STALE_TIME = 30000;

export function useGetConnections() {
  return useQuery([QUERY_KEY_ALL_CONNECTIONS], dataApi.getConnections, {
    staleTime: DEFAULT_STALE_TIME,
    notifyOnChangeProps: ['data', 'error'],
  });
}

export function useUpdateConnections(connections?: SqluiCore.ConnectionProps[]) {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ConnectionProps[] | undefined, void, number[]>(([from, to]) => {
    if (connections) {
      connections = getUpdatedOrdersForList(connections, from, to);

      queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(
        QUERY_KEY_ALL_CONNECTIONS,
        connections,
      );

      return dataApi.update(connections);
    }

    return Promise.reject();
  });
}

export function useGetConnectionById(connectionId?: string) {
  return useQuery(
    [connectionId],
    () => (!connectionId ? undefined : dataApi.getConnection(connectionId)),
    {
      enabled: !!connectionId,
      notifyOnChangeProps: ['data', 'error'],
    },
  );
}

export function useUpsertConnection() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ConnectionProps, void, SqluiCore.CoreConnectionProps>(
    dataApi.upsertConnection,
    {
      onSuccess: async (newConnection) => {
        queryClient.invalidateQueries(newConnection.id);
        queryClient.invalidateQueries(QUERY_KEY_ALL_CONNECTIONS);

        queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(
          QUERY_KEY_ALL_CONNECTIONS,
          (oldData) => {
            // find that entry
            let isNew = true;
            oldData = oldData?.map((connection) => {
              if (connection.id === newConnection.id) {
                isNew = false;
                return {
                  ...connection,
                  ...newConnection,
                };
              }
              return connection;
            });

            if (isNew) {
              oldData?.push({
                ...newConnection,
              });
            }

            return oldData;
          },
        );

        return newConnection;
      },
    },
  );
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  const { mutateAsync: addRecycleBinItem } = useAddRecycleBinItem();
  const { data: connections } = useGetConnections();
  const isSoftDeleteModeSetting = useIsSoftDeleteModeSetting();

  return useMutation<string, void, string>(dataApi.deleteConnection, {
    onSuccess: async (deletedConnectionId) => {
      queryClient.invalidateQueries(deletedConnectionId);
      queryClient.invalidateQueries(QUERY_KEY_ALL_CONNECTIONS);

      queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(
        QUERY_KEY_ALL_CONNECTIONS,
        (oldData) => {
          return oldData?.filter((connection) => connection.id !== deletedConnectionId);
        },
      );

      try {
        if (isSoftDeleteModeSetting) {
          // generate the connection backup to store in recyclebin
          const connectionToBackup = connections?.find(
            (connection) => connection.id === deletedConnectionId,
          );

          if (connectionToBackup) {
            // remove status before we backup.
            const { status, ...restOfConnectionMetaData } = connectionToBackup;
            await addRecycleBinItem({
              type: 'Connection',
              name: restOfConnectionMetaData.name,
              data: restOfConnectionMetaData,
            });
          }
        }
      } catch (err) {
        // TODO: add error handling
      }

      return deletedConnectionId;
    },
  });
}

export function useDuplicateConnection() {
  const { mutateAsync: upsertConnection, isLoading } = useUpsertConnection();

  return {
    mutateAsync: (connection: SqluiCore.CoreConnectionProps) => {
      // delete the id - so we can duplicate
      const duplicatedConnection = {
        name: `Conn ${new Date().toLocaleString()}`,
        connection: connection.connection,
      };
      return upsertConnection(duplicatedConnection);
    },
    isLoading,
  };
}

export function useImportConnection() {
  const { mutateAsync: upsertConnection, isLoading } = useUpsertConnection();

  return {
    mutateAsync: (connection: SqluiCore.CoreConnectionProps) => {
      // delete the id - so we can duplicate
      const duplicatedConnection = {
        id: connection.id,
        name: connection.name,
        connection: connection.connection,
      };
      return upsertConnection(duplicatedConnection);
    },
    isLoading,
  };
}

export function useGetDatabases(connectionId?: string) {
  const enabled = !!connectionId;

  return useQuery(
    [connectionId, 'databases'],
    () => (!enabled ? undefined : dataApi.getConnectionDatabases(connectionId)),
    {
      enabled,
      staleTime: DEFAULT_STALE_TIME,
    },
  );
}

export function useGetTables(connectionId?: string, databaseId?: string) {
  const enabled = !!connectionId && !!databaseId;

  return useQuery(
    [connectionId, databaseId, 'tables'],
    () => (!enabled ? undefined : dataApi.getConnectionTables(connectionId, databaseId)),
    {
      enabled,
      staleTime: DEFAULT_STALE_TIME,
    },
  );
}

export function useGetAllTableColumns(connectionId?: string, databaseId?: string) {
  const enabled = !!connectionId && !!databaseId;

  return useQuery(
    [connectionId, databaseId, 'all_table_columns'],
    async () => {
      if (!enabled) {
        return [];
      }

      const tables = await dataApi.getConnectionTables(connectionId, databaseId);
      const tableIds = tables.map((table) => table.name);

      const res: Record<string, SqluiCore.ColumnMetaData[]> = {};
      for (const tableId of tableIds) {
        res[tableId] = await dataApi.getConnectionColumns(connectionId, databaseId, tableId);
      }
      return res;
    },
    {
      enabled,
      staleTime: DEFAULT_STALE_TIME,
    },
  );
}

export function useGetColumns(connectionId?: string, databaseId?: string, tableId?: string) {
  const enabled = !!connectionId && !!databaseId && !!tableId;

  return useQuery(
    [connectionId, databaseId, tableId, 'columns'],
    () => (!enabled ? undefined : dataApi.getConnectionColumns(connectionId, databaseId, tableId)),
    {
      enabled,
      staleTime: DEFAULT_STALE_TIME,
    },
  );
}

export function useExecute() {
  return useMutation<SqluiCore.Result, void, SqluiFrontend.ConnectionQuery>(
    (query?: SqluiFrontend.ConnectionQuery) => dataApi.execute(query),
  );
}

export function refreshAfterExecution(
  query: SqluiFrontend.ConnectionQuery,
  queryClient: QueryClient,
) {
  if (!query) {
    return;
  }

  // if we have any one of these keywords, let's refresh the table...
  const KEYWORDS_TO_REFRESH_CONNECTION = [
    'DROP DATABASE',
    'CREATE DATABASE',
    'DROP TABLE',
    'CREATE TABLE',
    'ALTER TABLE',
    'DROP COLUMN',
    // for cassandra
    'CREATE KEYSPACE',
    'ALTER KEYSPACE',
    'DROP KEYSPACE',

    // for mongo
    '.INSERT',
    '.DELETE',
    '.UPDATE',
    '.DROP',
    '.CREATECOLLECTION',
    '.CREATEDATABASE',
    '.CREATE',

    // for azure table storage
    '.CREATETABLE',
    '.DELETETABLE',
  ];

  const shouldRefreshConnection = KEYWORDS_TO_REFRESH_CONNECTION.some((keyword) =>
    query?.sql?.toUpperCase()?.includes(keyword),
  );

  if (shouldRefreshConnection) {
    queryClient.invalidateQueries(query.connectionId);
    queryClient.invalidateQueries(QUERY_KEY_ALL_CONNECTIONS);
  }
}

export function useRetryConnection() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ConnectionMetaData, SqluiCore.ConnectionMetaData, string>(
    dataApi.reconnect,
    {
      onSettled: async (newSuccessConnection, newFailedConnection) => {
        // NOTE: here we used settled, because if the connection
        // went bad, we want to also refresh the data
        queryClient.invalidateQueries(QUERY_KEY_ALL_CONNECTIONS);

        queryClient.setQueryData<SqluiCore.ConnectionMetaData[] | undefined>(
          QUERY_KEY_ALL_CONNECTIONS,
          (oldData) => {
            // find that entry
            oldData = oldData?.map((connection) => {
              if (connection.id === newSuccessConnection?.id) {
                // good connnection
                queryClient.invalidateQueries(newSuccessConnection.id);
                return newSuccessConnection;
              }
              if (connection.id === newFailedConnection?.id) {
                // bad connection
                queryClient.invalidateQueries(newFailedConnection.id);
                return newFailedConnection;
              }
              return connection;
            });

            return oldData;
          },
        );
      },
    },
  );
}

export function useTestConnection() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.CoreConnectionMetaData, void, SqluiCore.CoreConnectionProps>(
    dataApi.test,
  );
}
