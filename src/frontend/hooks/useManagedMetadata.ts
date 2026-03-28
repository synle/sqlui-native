/** Mutation hooks for managed metadata CRUD (folders and requests for REST API connections). */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";
import { SqluiCore } from "typings";

/**
 * Invalidates database and table list caches for a connection after managed metadata changes.
 * @param queryClient - The React Query client.
 * @param connectionId - The connection ID whose caches should be invalidated.
 */
function invalidateManagedCaches(queryClient: ReturnType<typeof useQueryClient>, connectionId: string) {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === connectionId;
    },
  });
}

/**
 * Hook to create a managed database (folder) for a connection.
 * @returns Mutation that accepts connectionId and name.
 */
export function useCreateManagedDatabase() {
  const queryClient = useQueryClient();

  return useMutation<SqluiCore.ManagedDatabase, unknown, { connectionId: string; name: string }>(
    async ({ connectionId, name }) => {
      return dataApi.createManagedDatabase(connectionId, { name });
    },
    {
      onSuccess: (_data, { connectionId }) => {
        invalidateManagedCaches(queryClient, connectionId);
      },
    },
  );
}

/**
 * Hook to update a managed database's name and/or props.
 * @returns Mutation that accepts connectionId, managedDatabaseId, and body.
 */
export function useUpdateManagedDatabase() {
  const queryClient = useQueryClient();

  return useMutation<
    SqluiCore.ManagedDatabase,
    unknown,
    { connectionId: string; managedDatabaseId: string; body: { name?: string; props?: SqluiCore.ManagedProperties } }
  >(
    async ({ connectionId, managedDatabaseId, body }) => {
      // Both rename and props update use the same PUT endpoint; cast to satisfy the overloaded signatures
      return dataApi.renameManagedDatabase(connectionId, managedDatabaseId, body as { name: string });
    },
    {
      onSuccess: (_data, { connectionId }) => {
        invalidateManagedCaches(queryClient, connectionId);
      },
    },
  );
}

/**
 * Hook to delete a managed database (folder) and its child tables.
 * @returns Mutation that accepts connectionId and managedDatabaseId.
 */
export function useDeleteManagedDatabase() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { connectionId: string; managedDatabaseId: string }>(
    async ({ connectionId, managedDatabaseId }) => {
      await dataApi.deleteManagedDatabase(connectionId, managedDatabaseId);
    },
    {
      onSuccess: (_data, { connectionId }) => {
        invalidateManagedCaches(queryClient, connectionId);
      },
    },
  );
}

/**
 * Hook to create a managed table (request) within a database folder.
 * @returns Mutation that accepts connectionId, databaseId, and name.
 */
export function useCreateManagedTable() {
  const queryClient = useQueryClient();

  return useMutation<SqluiCore.ManagedTable, unknown, { connectionId: string; databaseId: string; name: string }>(
    async ({ connectionId, databaseId, name }) => {
      return dataApi.createManagedTable(connectionId, databaseId, { name });
    },
    {
      onSuccess: (_data, { connectionId }) => {
        invalidateManagedCaches(queryClient, connectionId);
      },
    },
  );
}

/**
 * Hook to update a managed table's name and/or props.
 * @returns Mutation that accepts connectionId, databaseId, managedTableId, and body.
 */
export function useUpdateManagedTable() {
  const queryClient = useQueryClient();

  return useMutation<
    SqluiCore.ManagedTable,
    unknown,
    { connectionId: string; databaseId: string; managedTableId: string; body: { name?: string; props?: any } }
  >(
    async ({ connectionId, databaseId, managedTableId, body }) => {
      return dataApi.updateManagedTable(connectionId, databaseId, managedTableId, body);
    },
    {
      onSuccess: (_data, { connectionId }) => {
        invalidateManagedCaches(queryClient, connectionId);
      },
    },
  );
}

/**
 * Hook to delete a managed table (request).
 * @returns Mutation that accepts connectionId, databaseId, and managedTableId.
 */
export function useDeleteManagedTable() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, { connectionId: string; databaseId: string; managedTableId: string }>(
    async ({ connectionId, databaseId, managedTableId }) => {
      await dataApi.deleteManagedTable(connectionId, databaseId, managedTableId);
    },
    {
      onSuccess: (_data, { connectionId }) => {
        invalidateManagedCaches(queryClient, connectionId);
      },
    },
  );
}
