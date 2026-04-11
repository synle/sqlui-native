/** Schema cache refresh and connection retry hooks. */
import { QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";
import { queryKeys } from "src/frontend/hooks/queryKeys";
import { SqluiCore } from "typings";

/**
 * Invalidates all column-related React Query caches for a given database.
 * Covers the tables list, bulk column fetch, cached schema, and individual column queries.
 * @param queryClient - The React Query client.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 */
export function invalidateSchemaForDatabase(queryClient: QueryClient, connectionId: string, databaseId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.tables.list(connectionId, databaseId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.columns.allForDatabase(connectionId, databaseId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.schema.cached(connectionId, databaseId) });
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === connectionId && key[1] === databaseId && key[3] === "columns";
    },
  });
}

/**
 * Invalidates column-related React Query caches for a specific table.
 * @param queryClient - The React Query client.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 * @param tableId - The table name.
 */
export function invalidateSchemaForTable(queryClient: QueryClient, connectionId: string, databaseId: string, tableId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.columns.list(connectionId, databaseId, tableId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.columns.allForDatabase(connectionId, databaseId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.schema.cached(connectionId, databaseId) });
}

/**
 * Hook to retry/reconnect a failed connection and refresh its cache data.
 * @returns Mutation that accepts a connection ID to reconnect.
 */
export function useRetryConnection() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ConnectionMetaData, SqluiCore.ConnectionMetaData, string>({
    mutationFn: async (connectionId: string) => {
      // Clear all client-side caches for this connection before reconnecting
      // This removes cached databases, tables, columns, and allTableColumns
      queryClient.removeQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === connectionId;
        },
      });
      return dataApi.refreshConnection(connectionId);
    },
    onSettled: async (newSuccessConnection, newFailedConnection) => {
      // NOTE: here we used settled, because if the connection
      // went bad, we want to also refresh the data
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

      // Invalidate to trigger fresh refetch of connection-related data
      if (connectionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.connections.byId(connectionId) });
      }
    },
  });
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
