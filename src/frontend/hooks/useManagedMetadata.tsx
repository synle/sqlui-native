/** Mutation hooks for managed metadata (REST API folders and requests). */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProxyApi } from "src/frontend/data/api";
import { queryKeys } from "src/frontend/hooks/queryKeys";
import { SqluiCore } from "typings";

/**
 * Hook to create a managed database (folder) for a connection.
 * Invalidates the databases query on success.
 * @returns Mutation that accepts { connectionId, name }.
 */
export function useCreateManagedDatabase() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ManagedDatabase, unknown, { connectionId: string; name: string }>(
    ({ connectionId, name }) => ProxyApi.createManagedDatabase(connectionId, { name }),
    {
      onSuccess: (_data, { connectionId }) => {
        queryClient.invalidateQueries(queryKeys.databases.list(connectionId));
      },
    },
  );
}

/**
 * Hook to delete a managed database (folder) and its child tables.
 * Invalidates the databases query on success.
 * @returns Mutation that accepts { connectionId, managedDatabaseId }.
 */
export function useDeleteManagedDatabase() {
  const queryClient = useQueryClient();
  return useMutation<unknown, unknown, { connectionId: string; managedDatabaseId: string }>(
    ({ connectionId, managedDatabaseId }) => ProxyApi.deleteManagedDatabase(connectionId, managedDatabaseId),
    {
      onSuccess: (_data, { connectionId }) => {
        queryClient.invalidateQueries(queryKeys.databases.list(connectionId));
      },
    },
  );
}

/**
 * Hook to update a managed database's name and/or props (e.g., folder variables).
 * Invalidates the databases query on success (covers both renames and prop updates).
 * @returns Mutation that accepts { connectionId, managedDatabaseId, body }.
 */
export function useUpdateManagedDatabase() {
  const queryClient = useQueryClient();
  return useMutation<
    SqluiCore.ManagedDatabase,
    unknown,
    { connectionId: string; managedDatabaseId: string; body: { name?: string; props?: SqluiCore.ManagedProperties } }
  >(({ connectionId, managedDatabaseId, body }) => ProxyApi.updateManagedDatabase(connectionId, managedDatabaseId, body as any), {
    onSuccess: (_data, { connectionId }) => {
      queryClient.invalidateQueries(queryKeys.databases.list(connectionId));
    },
  });
}

/**
 * Hook to create a managed table (request) within a database folder.
 * Invalidates the tables query on success.
 * @returns Mutation that accepts { connectionId, databaseId, name }.
 */
export function useCreateManagedTable() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ManagedTable, unknown, { connectionId: string; databaseId: string; name: string }>(
    ({ connectionId, databaseId, name }) => ProxyApi.createManagedTable(connectionId, databaseId, { name }),
    {
      onSuccess: (_data, { connectionId, databaseId }) => {
        queryClient.invalidateQueries(queryKeys.tables.list(connectionId, databaseId));
      },
    },
  );
}

/**
 * Hook to delete a managed table (request).
 * Invalidates the tables query on success.
 * @returns Mutation that accepts { connectionId, databaseId, managedTableId }.
 */
export function useDeleteManagedTable() {
  const queryClient = useQueryClient();
  return useMutation<unknown, unknown, { connectionId: string; databaseId: string; managedTableId: string }>(
    ({ connectionId, databaseId, managedTableId }) => ProxyApi.deleteManagedTable(connectionId, databaseId, managedTableId),
    {
      onSuccess: (_data, { connectionId, databaseId }) => {
        queryClient.invalidateQueries(queryKeys.tables.list(connectionId, databaseId));
      },
    },
  );
}

/**
 * Hook to update a managed table's name and/or props (e.g., saved query).
 * Invalidates the tables query on success.
 * @returns Mutation that accepts { connectionId, databaseId, managedTableId, body }.
 */
export function useUpdateManagedTable() {
  const queryClient = useQueryClient();
  return useMutation<
    SqluiCore.ManagedTable,
    unknown,
    {
      connectionId: string;
      databaseId: string;
      managedTableId: string;
      body: { name?: string; props?: SqluiCore.ManagedProperties } | SqluiCore.ManagedProperties;
    }
  >(({ connectionId, databaseId, managedTableId, body }) => ProxyApi.updateManagedTable(connectionId, databaseId, managedTableId, body), {
    onSuccess: (_data, { connectionId, databaseId }) => {
      queryClient.invalidateQueries(queryKeys.tables.list(connectionId, databaseId));
    },
  });
}
