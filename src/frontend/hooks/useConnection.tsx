/** Connection CRUD hooks and re-exports for schema and refresh hooks. */
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import dataApi from "src/frontend/data/api";
import { useAddRecycleBinItem } from "src/frontend/hooks/useFolderItems";
import { queryKeys } from "src/frontend/hooks/queryKeys";
import { useIsSoftDeleteModeSetting } from "src/frontend/hooks/useSetting";
import { getUpdatedOrdersForList } from "src/frontend/utils/commonUtils";
import { SqluiCore, SqluiFrontend } from "typings";

// Re-export schema hooks so existing imports from "useConnection" continue to work.
export { useGetDatabases, useGetTables, useGetCachedSchema, useGetAllTableColumns, useGetColumns } from "src/frontend/hooks/useSchema";
export { useRetryConnection, useRefreshDatabase, useRefreshTable } from "src/frontend/hooks/useSchemaRefresh";

/**
 * Hook to fetch all database connections.
 * @returns React Query result containing an array of connections.
 */
export function useGetConnections() {
  return useQuery({
    queryKey: queryKeys.connections.all,
    queryFn: dataApi.getConnections,
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
  return useMutation<SqluiCore.ConnectionProps[] | undefined, void, number[]>({
    mutationFn: ([from, to]) => {
      if (connections) {
        connections = getUpdatedOrdersForList(connections, from, to);

        queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(queryKeys.connections.all, connections);

        return dataApi.update(connections);
      }

      return Promise.reject();
    },
  });
}

/**
 * Hook to fetch a single connection by ID.
 * @param connectionId - The connection ID to fetch.
 * @returns React Query result containing the connection or undefined.
 */
export function useGetConnectionById(connectionId?: string) {
  return useQuery({
    queryKey: connectionId ? queryKeys.connections.byId(connectionId) : [connectionId],
    queryFn: () => (!connectionId ? undefined : dataApi.getConnection(connectionId)),
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
  return useMutation<SqluiCore.ConnectionProps, void, SqluiCore.CoreConnectionProps>({
    mutationFn: dataApi.upsertConnection,
    onSuccess: async (newConnection) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connections.byId(newConnection.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.connections.all });

      queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(queryKeys.connections.all, (oldData) => {
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

  return useMutation<string, void, string>({
    mutationFn: dataApi.deleteConnection,
    onSuccess: async (deletedConnectionId) => {
      queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(queryKeys.connections.all, (oldData) => {
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
  const { mutateAsync: upsertConnection, isPending } = useUpsertConnection();

  return {
    mutateAsync: (connection: SqluiCore.CoreConnectionProps) => {
      // delete the id - so we can duplicate
      const duplicatedConnection = {
        name: `Conn ${new Date().toLocaleString()}`,
        connection: connection.connection,
      };
      return upsertConnection(duplicatedConnection);
    },
    isLoading: isPending,
  };
}

/**
 * Hook to import a connection, preserving its original ID and name.
 * @returns Mutation that accepts connection properties to import.
 */
export function useImportConnection() {
  const { mutateAsync: upsertConnection, isPending } = useUpsertConnection();

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
    isLoading: isPending,
  };
}

/**
 * Hook to execute a SQL/NoSQL query against a connection.
 * @returns Mutation that accepts a ConnectionQuery and returns the result.
 */
export function useExecute() {
  return useMutation<SqluiCore.Result, void, SqluiFrontend.ConnectionQuery>({
    mutationFn: (query?: SqluiFrontend.ConnectionQuery) => dataApi.execute(query),
  });
}

/**
 * Clears backend disk cache and invalidates frontend schema caches for the queried
 * database in the background after a successful query execution. This ensures DDL
 * changes (CREATE TABLE, ALTER TABLE, etc.) are reflected in the tree view.
 * @param query - The executed query with connectionId and databaseId.
 * @param queryClient - The React Query client used to invalidate caches.
 */
export function refreshAfterExecution(query: SqluiFrontend.ConnectionQuery, queryClient: QueryClient) {
  if (!query?.connectionId || !query?.databaseId) return;
  const { connectionId, databaseId } = query;
  // Fire-and-forget: clear backend disk cache, then invalidate frontend caches
  dataApi
    .refreshDatabase(connectionId, databaseId)
    .then(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables.list(connectionId, databaseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.columns.allForDatabase(connectionId, databaseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.schema.cached(connectionId, databaseId) });
    })
    .catch(() => {
      // Silently ignore — background refresh should not disrupt the user
    });
}

/**
 * Hook to test a connection without persisting it.
 * @returns Mutation that accepts connection properties and returns test results.
 */
export function useTestConnection() {
  return useMutation<SqluiCore.CoreConnectionMetaData, void, SqluiCore.CoreConnectionProps>({
    mutationFn: (connection) => dataApi.test(connection),
  });
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
    queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(queryKeys.connections.all, (oldData) => {
      if (!oldData) return oldData;
      return oldData.map((c) => (checkedRef.current.has(c.id) && !c.status ? { ...c, status: "loading" as const } : c));
    });

    // Fire individual auth checks in parallel — each resolves independently
    for (const conn of unchecked) {
      dataApi
        .reconnect(conn.id)
        .then((result) => {
          queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(queryKeys.connections.all, (oldData) =>
            oldData?.map((c) => (c.id === conn.id ? { ...c, ...result } : c)),
          );
          queryClient.invalidateQueries({ queryKey: queryKeys.connections.byId(conn.id) });
        })
        .catch(() => {
          queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(queryKeys.connections.all, (oldData) =>
            oldData?.map((c) => (c.id === conn.id ? { ...c, status: "offline" as const } : c)),
          );
        });
    }
  }, [connections, queryClient]);
}
