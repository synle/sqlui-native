/** Schema invalidation hooks for reconnecting and refreshing cached schema data. */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";
import { queryKeys } from "src/frontend/hooks/queryKeys";
import { SqluiCore } from "typings";

/**
 * Invalidates all frontend React Query caches related to a specific database.
 * Clears tables, all_table_columns, cached_schema, and per-table column caches.
 * @param queryClient - The React Query client.
 * @param connectionId - The connection ID.
 * @param databaseId - The database ID.
 */
function invalidateSchemaForDatabase(queryClient: ReturnType<typeof useQueryClient>, connectionId: string, databaseId: string) {
  queryClient.invalidateQueries(queryKeys.tables.list(connectionId, databaseId));
  queryClient.invalidateQueries(queryKeys.schema.allTableColumns(connectionId, databaseId));
  queryClient.invalidateQueries(queryKeys.schema.cached(connectionId, databaseId));
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === connectionId && key[1] === databaseId && key[3] === "columns";
    },
  });
}

/**
 * Invalidates all frontend React Query caches related to a specific table.
 * Clears per-table columns and the bulk all_table_columns cache.
 * @param queryClient - The React Query client.
 * @param connectionId - The connection ID.
 * @param databaseId - The database ID.
 * @param tableId - The table ID.
 */
function invalidateSchemaForTable(
  queryClient: ReturnType<typeof useQueryClient>,
  connectionId: string,
  databaseId: string,
  tableId: string,
) {
  queryClient.invalidateQueries(queryKeys.columns.list(connectionId, databaseId, tableId));
  queryClient.invalidateQueries(queryKeys.schema.allTableColumns(connectionId, databaseId));
}

/**
 * Hook to retry/reconnect a failed connection and refresh its cache data.
 * Clears all client-side caches for the connection before reconnecting.
 * @returns Mutation that accepts a connection ID to reconnect.
 */
export function useRetryConnection() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ConnectionMetaData, SqluiCore.ConnectionMetaData, string>(
    async (connectionId: string) => {
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === connectionId;
        },
      });
      return dataApi.refreshConnection(connectionId);
    },
    {
      onSettled: async (newSuccessConnection, newFailedConnection) => {
        const connectionId = newSuccessConnection?.id || newFailedConnection?.id;

        queryClient.setQueryData<SqluiCore.ConnectionMetaData[] | undefined>(queryKeys.connections.all, (oldData) => {
          return oldData?.map((connection) => {
            if (connection.id === newSuccessConnection?.id) {
              return newSuccessConnection;
            }
            if (connection.id === newFailedConnection?.id) {
              return newFailedConnection;
            }
            return connection;
          });
        });

        if (connectionId) {
          queryClient.invalidateQueries(queryKeys.connections.byId(connectionId));
        }
      },
    },
  );
}

/**
 * Hook to refresh (clear backend + frontend cache and refetch) data for a specific database.
 * Clears the backend disk cache then invalidates frontend React Query cache for tables and columns.
 * @returns A callback that accepts connectionId and databaseId to refresh.
 */
export function useRefreshDatabase() {
  const queryClient = useQueryClient();
  return async (connectionId: string, databaseId: string) => {
    await dataApi.refreshDatabase(connectionId, databaseId);
    invalidateSchemaForDatabase(queryClient, connectionId, databaseId);
  };
}

/**
 * Hook to refresh (clear backend + frontend cache and refetch) column data for a specific table.
 * Clears the backend disk cache then invalidates frontend React Query cache for columns.
 * @returns A callback that accepts connectionId, databaseId, and tableId to refresh.
 */
export function useRefreshTable() {
  const queryClient = useQueryClient();
  return async (connectionId: string, databaseId: string, tableId: string) => {
    await dataApi.refreshTable(connectionId, databaseId, tableId);
    invalidateSchemaForTable(queryClient, connectionId, databaseId, tableId);
  };
}
