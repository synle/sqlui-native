import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import dataApi from "src/frontend/data/api";
import { useAddRecycleBinItem } from "src/frontend/hooks/useFolderItems";
import { useIsSoftDeleteModeSetting } from "src/frontend/hooks/useSetting";
import { getUpdatedOrdersForList } from "src/frontend/utils/commonUtils";
import { SqluiCore, SqluiFrontend } from "typings";

/** React Query cache key for all connections. */
const QUERY_KEY_ALL_CONNECTIONS = "connections";

/**
 * Hook to fetch all database connections.
 * @returns React Query result containing an array of connections.
 */
export function useGetConnections() {
  return useQuery([QUERY_KEY_ALL_CONNECTIONS], dataApi.getConnections, {
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to reorder connections via drag-and-drop.
 * @param connections - Current list of connections to reorder.
 * @returns Mutation that accepts [fromIndex, toIndex] to reorder.
 */
export function useUpdateConnections(connections?: SqluiCore.ConnectionProps[]) {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ConnectionProps[] | undefined, void, number[]>(([from, to]) => {
    if (connections) {
      connections = getUpdatedOrdersForList(connections, from, to);

      queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>([QUERY_KEY_ALL_CONNECTIONS], connections);

      return dataApi.update(connections);
    }

    return Promise.reject();
  });
}

/**
 * Hook to fetch a single connection by ID.
 * @param connectionId - The connection ID to fetch.
 * @returns React Query result containing the connection or undefined.
 */
export function useGetConnectionById(connectionId?: string) {
  return useQuery([connectionId], () => (!connectionId ? undefined : dataApi.getConnection(connectionId)), {
    enabled: !!connectionId,
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to create or update a connection. Optimistically updates the query cache.
 * @returns Mutation that accepts connection properties and returns the upserted connection.
 */
export function useUpsertConnection() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ConnectionProps, void, SqluiCore.CoreConnectionProps>(dataApi.upsertConnection, {
    onSuccess: async (newConnection) => {
      queryClient.invalidateQueries([newConnection.id]);
      queryClient.invalidateQueries([QUERY_KEY_ALL_CONNECTIONS]);

      queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>([QUERY_KEY_ALL_CONNECTIONS], (oldData) => {
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
      });

      return newConnection;
    },
  });
}

/**
 * Hook to delete a connection. Optionally backs up to recycle bin if soft delete is enabled.
 * @returns Mutation that accepts a connection ID to delete.
 */
export function useDeleteConnection() {
  const queryClient = useQueryClient();
  const { mutateAsync: addRecycleBinItem } = useAddRecycleBinItem();
  const { data: connections } = useGetConnections();
  const isSoftDeleteModeSetting = useIsSoftDeleteModeSetting();

  return useMutation<string, void, string>(dataApi.deleteConnection, {
    onSuccess: async (deletedConnectionId) => {
      queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>([QUERY_KEY_ALL_CONNECTIONS], (oldData) => {
        return oldData?.filter((connection) => connection.id !== deletedConnectionId);
      });

      try {
        if (isSoftDeleteModeSetting) {
          // generate the connection backup to store in recyclebin
          const connectionToBackup = connections?.find((connection) => connection.id === deletedConnectionId);

          if (connectionToBackup) {
            // remove status before we backup.
            const { status, ...restOfConnectionMetaData } = connectionToBackup;
            await addRecycleBinItem({
              type: "Connection",
              name: restOfConnectionMetaData.name,
              data: restOfConnectionMetaData,
            });
          }
        }
      } catch (err) {
        console.error("useConnection.tsx:addRecycleBinItem", err);
        // TODO: add error handling
      }

      return deletedConnectionId;
    },
  });
}

/**
 * Hook to duplicate an existing connection with a new name and ID.
 * @returns Mutation that accepts connection properties to duplicate.
 */
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

/**
 * Hook to import a connection, preserving its original ID and name.
 * @returns Mutation that accepts connection properties to import.
 */
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

/**
 * Hook to fetch databases for a given connection.
 * @param connectionId - The connection ID to fetch databases for.
 * @returns React Query result containing an array of database metadata.
 */
export function useGetDatabases(connectionId?: string) {
  const enabled = !!connectionId;

  return useQuery([connectionId, "databases"], () => (!enabled ? undefined : dataApi.getConnectionDatabases(connectionId)), {
    enabled,
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
    [connectionId, databaseId, "tables"],
    () => (!enabled ? undefined : dataApi.getConnectionTables(connectionId, databaseId)),
    {
      enabled,
    },
  );
}

/**
 * Hook to fetch columns for all tables in a given connection and database.
 * @param connectionId - The connection ID.
 * @param databaseId - The database ID.
 * @returns React Query result containing a record mapping table names to column metadata arrays.
 */
export function useGetCachedSchema(connectionId?: string, databaseId?: string) {
  const enabled = !!connectionId && !!databaseId;

  return useQuery(
    [connectionId, databaseId, "cached_schema"],
    () => (!enabled ? undefined : dataApi.getCachedSchema(connectionId, databaseId)),
    {
      enabled,
      staleTime: 30 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchInterval: 30 * 1000,
    },
  );
}

/**
 * Fetches columns for ALL tables in a database by making individual API calls.
 * Use sparingly — prefer useGetCachedColumns for read-only access to already-cached data.
 * @param connectionId - The connection ID.
 * @param databaseId - The database ID.
 * @returns React Query result containing a record mapping table names to column metadata arrays.
 */
export function useGetAllTableColumns(connectionId?: string, databaseId?: string) {
  const enabled = !!connectionId && !!databaseId;

  return useQuery(
    [connectionId, databaseId, "all_table_columns"],
    async () => {
      if (!enabled) {
        return {} as Record<string, SqluiCore.ColumnMetaData[]>;
      }

      const tables = await dataApi.getConnectionTables(connectionId, databaseId);
      const tableIds = tables.map((table) => table.name);

      const res: Record<string, SqluiCore.ColumnMetaData[]> = {};
      const concurrency = 3;
      for (let i = 0; i < tableIds.length; i += concurrency) {
        const batch = tableIds.slice(i, i + concurrency);
        const results = await Promise.all(batch.map((tableId) => dataApi.getConnectionColumns(connectionId, databaseId, tableId)));
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
    [connectionId, databaseId, tableId, "columns"],
    () => (!enabled ? undefined : dataApi.getConnectionColumns(connectionId, databaseId, tableId)),
    {
      enabled,
      staleTime: 60000, // refetch in background after 1 minute
      keepPreviousData: true, // show cached data while refetching
    },
  );
}

/**
 * Hook to execute a SQL/NoSQL query against a connection.
 * @returns Mutation that accepts a ConnectionQuery and returns the result.
 */
export function useExecute() {
  return useMutation<SqluiCore.Result, void, SqluiFrontend.ConnectionQuery>((query?: SqluiFrontend.ConnectionQuery) =>
    dataApi.execute(query),
  );
}

/**
 * Invalidates relevant query caches after executing DDL or data-modifying statements.
 * @param query - The executed query to check for DDL/DML keywords.
 * @param queryClient - The React Query client used to invalidate caches.
 */
export function refreshAfterExecution(_query: SqluiFrontend.ConnectionQuery, _queryClient: QueryClient) {
  // No-op: DDL detection previously triggered automatic cache invalidation
  // which caused expensive reconnection cascades on slow connections.
  // Users should manually refresh/reconnect to pick up schema changes.
}

/**
 * Hook to retry/reconnect a failed connection and refresh its cache data.
 * @returns Mutation that accepts a connection ID to reconnect.
 */
export function useRetryConnection() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ConnectionMetaData, SqluiCore.ConnectionMetaData, string>(
    async (connectionId: string) => {
      // Clear all client-side caches for this connection before reconnecting
      // This removes cached databases, tables, columns, and all_table_columns
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
        // NOTE: here we used settled, because if the connection
        // went bad, we want to also refresh the data
        const connectionId = newSuccessConnection?.id || newFailedConnection?.id;

        queryClient.setQueryData<SqluiCore.ConnectionMetaData[] | undefined>([QUERY_KEY_ALL_CONNECTIONS], (oldData) => {
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
          queryClient.invalidateQueries([connectionId]);
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
    // Clear backend disk cache for this database
    await dataApi.refreshDatabase(connectionId, databaseId);
    // Invalidate frontend cache to trigger refetch for active queries
    queryClient.invalidateQueries([connectionId, databaseId, "tables"]);
    queryClient.invalidateQueries([connectionId, databaseId, "all_table_columns"]);
    queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && key[0] === connectionId && key[1] === databaseId && key[3] === "columns";
      },
    });
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
    // Clear backend disk cache for this table
    await dataApi.refreshTable(connectionId, databaseId, tableId);
    // Invalidate frontend cache to trigger refetch for active queries
    queryClient.invalidateQueries([connectionId, databaseId, tableId, "columns"]);
    queryClient.invalidateQueries([connectionId, databaseId, "all_table_columns"]);
  };
}

/**
 * Hook to test a connection without persisting it.
 * @returns Mutation that accepts connection properties and returns test results.
 */
export function useTestConnection() {
  return useMutation<SqluiCore.CoreConnectionMetaData, void, SqluiCore.CoreConnectionProps>(dataApi.test);
}

/**
 * Hook that auto-triggers individual auth checks for connections without a status.
 * Sets status to "loading" immediately, then resolves to "online" or "offline" per connection.
 * Each connection is checked independently so failures don't block others.
 * @param connections - The current list of connections from useGetConnections.
 */
export function useAutoConnectAll(connections?: SqluiCore.ConnectionProps[]) {
  const queryClient = useQueryClient();
  const checkedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!connections) return;

    const unchecked = connections.filter((c) => !c.status && !checkedRef.current.has(c.id));
    if (unchecked.length === 0) return;

    for (const conn of unchecked) {
      checkedRef.current.add(conn.id);
    }

    // Mark all unchecked connections as "loading" immediately
    queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>([QUERY_KEY_ALL_CONNECTIONS], (oldData) => {
      if (!oldData) return oldData;
      return oldData.map((c) => (checkedRef.current.has(c.id) && !c.status ? { ...c, status: "loading" as const } : c));
    });

    // Fire individual auth checks in parallel — each resolves independently
    for (const conn of unchecked) {
      dataApi
        .reconnect(conn.id)
        .then((result) => {
          queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>([QUERY_KEY_ALL_CONNECTIONS], (oldData) =>
            oldData?.map((c) => (c.id === conn.id ? { ...c, ...result } : c)),
          );
          queryClient.invalidateQueries([conn.id]);
        })
        .catch(() => {
          queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>([QUERY_KEY_ALL_CONNECTIONS], (oldData) =>
            oldData?.map((c) => (c.id === conn.id ? { ...c, status: "offline" as const } : c)),
          );
        });
    }
  }, [connections, queryClient]);
}
