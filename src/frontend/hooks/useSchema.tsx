/** Schema query hooks for databases, tables, and columns. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";
import { queryKeys } from "src/frontend/hooks/queryKeys";
import { SqluiCore } from "typings";

/**
 * Hook to fetch databases for a given connection.
 * @param connectionId - The connection ID to fetch databases for.
 * @returns React Query result containing an array of database metadata.
 */
export function useGetDatabases(connectionId?: string) {
  const enabled = !!connectionId;

  return useQuery({
    queryKey: connectionId ? queryKeys.databases.list(connectionId) : [connectionId, "databases"],
    queryFn: () => (!enabled ? undefined : dataApi.getConnectionDatabases(connectionId)),
    enabled,
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to fetch tables for a given connection and database.
 * @param connectionId - The connection ID.
 * @param databaseId - The database ID.
 * @returns React Query result containing an array of table metadata.
 */
export function useGetTables(connectionId?: string, databaseId?: string) {
  const enabled = !!connectionId && !!databaseId;

  return useQuery({
    queryKey: connectionId && databaseId ? queryKeys.tables.list(connectionId, databaseId) : [connectionId, databaseId, "tables"],
    queryFn: () => (!enabled ? undefined : dataApi.getConnectionTables(connectionId, databaseId)),
    enabled,
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to fetch consolidated cached schema (databases, tables, columns) from the backend disk cache.
 * No live database queries are made — returns only what is already cached on the server.
 * @param connectionId - The connection ID.
 * @param databaseId - The database ID.
 * @returns React Query result containing cached databases, tables, and columns.
 */
export function useGetCachedSchema(connectionId?: string, databaseId?: string) {
  const enabled = !!connectionId && !!databaseId;

  return useQuery({
    queryKey: connectionId && databaseId ? queryKeys.schema.cached(connectionId, databaseId) : [connectionId, databaseId, "cachedSchema"],
    queryFn: () => (!enabled ? undefined : dataApi.getCachedSchema(connectionId, databaseId)),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Fetches columns for ALL tables in a database by making individual API calls.
 * Use sparingly — prefer useGetCachedSchema for read-only access to already-cached data.
 * @param connectionId - The connection ID.
 * @param databaseId - The database ID.
 * @returns React Query result containing a record mapping table names to column metadata arrays.
 */
export function useGetAllTableColumns(connectionId?: string, databaseId?: string) {
  const enabled = !!connectionId && !!databaseId;
  const queryClient = useQueryClient();

  // Use backend disk cache as placeholder so consumers render immediately
  // while live column fetches complete in the background.
  const cachedSchemaKey =
    connectionId && databaseId ? queryKeys.schema.cached(connectionId, databaseId) : [connectionId, databaseId, "cachedSchema"];
  const cachedSchema = queryClient.getQueryData<{
    databases: SqluiCore.DatabaseMetaData[];
    tables: SqluiCore.TableMetaData[];
    columns: Record<string, SqluiCore.ColumnMetaData[]>;
  }>(cachedSchemaKey);

  return useQuery({
    queryKey:
      connectionId && databaseId
        ? queryKeys.columns.allForDatabase(connectionId, databaseId)
        : [connectionId, databaseId, "allTableColumns"],
    queryFn: async () => {
      if (!enabled) {
        return {} as Record<string, SqluiCore.ColumnMetaData[]>;
      }

      const tables = await dataApi.getConnectionTables(connectionId, databaseId);
      const tableIds = tables.map((table) => table.name);

      // Let columnFetchThrottle in ProxyApi.getConnectionColumns handle concurrency —
      // no manual batching needed here. All fetches are queued and the throttle
      // limits to 3 concurrent requests per connection.
      const results = await Promise.all(tableIds.map((tableId) => dataApi.getConnectionColumns(connectionId, databaseId, tableId)));
      const res: Record<string, SqluiCore.ColumnMetaData[]> = {};
      for (let i = 0; i < tableIds.length; i++) {
        res[tableIds[i]] = results[i];
      }

      // Seed individual column caches so useGetColumns doesn't re-fetch
      for (const [tableId, columns] of Object.entries(res)) {
        queryClient.setQueryData(queryKeys.columns.list(connectionId, databaseId, tableId), columns);
      }

      return res;
    },
    enabled,
    placeholderData: cachedSchema?.columns ?? undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to fetch columns for a specific table.
 * @param connectionId - The connection ID.
 * @param databaseId - The database ID.
 * @param tableId - The table ID.
 * @returns React Query result containing an array of column metadata.
 */
export function useGetColumns(connectionId?: string, databaseId?: string, tableId?: string) {
  const enabled = !!connectionId && !!databaseId && !!tableId;

  return useQuery({
    queryKey:
      connectionId && databaseId && tableId
        ? queryKeys.columns.list(connectionId, databaseId, tableId)
        : [connectionId, databaseId, tableId, "columns"],
    queryFn: () => (!enabled ? undefined : dataApi.getConnectionColumns(connectionId, databaseId, tableId)),
    enabled,
    staleTime: 60000, // refetch in background after 1 minute
    placeholderData: (prev) => prev, // show cached data while refetching (replaces keepPreviousData)
    notifyOnChangeProps: ["data", "error"],
  });
}
