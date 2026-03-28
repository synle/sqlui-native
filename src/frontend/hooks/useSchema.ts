/** Schema read hooks for fetching databases, tables, columns, and cached schema data. */
import { useQuery } from "@tanstack/react-query";
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

  return useQuery(queryKeys.databases.list(connectionId!), () => (!enabled ? undefined : dataApi.getConnectionDatabases(connectionId)), {
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

  return useQuery(
    queryKeys.tables.list(connectionId!, databaseId!),
    () => (!enabled ? undefined : dataApi.getConnectionTables(connectionId!, databaseId!)),
    {
      enabled,
      notifyOnChangeProps: ["data", "error"],
    },
  );
}

/**
 * Hook to fetch the cached schema (databases + tables + columns) for a connection and database.
 * Returns only what's already cached on the backend — no new database queries are made.
 * @param connectionId - The connection ID.
 * @param databaseId - The database ID.
 * @returns React Query result containing databases, tables, and a columns record.
 */
export function useGetCachedSchema(connectionId?: string, databaseId?: string) {
  const enabled = !!connectionId && !!databaseId;

  return useQuery(
    queryKeys.schema.cached(connectionId!, databaseId!),
    () => (!enabled ? undefined : dataApi.getCachedSchema(connectionId!, databaseId!)),
    {
      enabled,
      staleTime: 30 * 1000,
      cacheTime: 5 * 60 * 1000,
      notifyOnChangeProps: ["data", "error"],
    },
  );
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

  return useQuery(
    queryKeys.schema.allTableColumns(connectionId!, databaseId!),
    async () => {
      if (!enabled) {
        return {} as Record<string, SqluiCore.ColumnMetaData[]>;
      }

      const tables = await dataApi.getConnectionTables(connectionId!, databaseId!);
      const tableIds = tables.map((table) => table.name);

      const res: Record<string, SqluiCore.ColumnMetaData[]> = {};
      const concurrency = 3;
      for (let i = 0; i < tableIds.length; i += concurrency) {
        const batch = tableIds.slice(i, i + concurrency);
        const results = await Promise.all(batch.map((tableId) => dataApi.getConnectionColumns(connectionId!, databaseId!, tableId)));
        for (let j = 0; j < batch.length; j++) {
          res[batch[j]] = results[j];
        }
      }
      return res;
    },
    {
      enabled,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      notifyOnChangeProps: ["data", "error"],
    },
  );
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

  return useQuery(
    queryKeys.columns.list(connectionId!, databaseId!, tableId!),
    () => (!enabled ? undefined : dataApi.getConnectionColumns(connectionId!, databaseId!, tableId!)),
    {
      enabled,
      staleTime: 60000,
      keepPreviousData: true,
      notifyOnChangeProps: ["data", "error"],
    },
  );
}
