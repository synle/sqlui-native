import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";
import { SqluiCore } from "typings";

/** React Query cache key for query version history. */
const QUERY_KEY = "queryVersionHistory";

/** Minimum query length before delta tracking starts. */
export const MIN_TRACKING_LENGTH = 30;

/** Minimum character delta to trigger a new version entry. */
export const DELTA_THRESHOLD = 5;

/** Debounce delay in milliseconds for delta tracking. */
export const DEBOUNCE_MS = 3000;

/** Hook to fetch all query version history entries. */
export function useGetQueryVersionHistory() {
  return useQuery<SqluiCore.QueryVersionEntry[]>([QUERY_KEY], () => dataApi.getQueryVersionHistory(), {
    notifyOnChangeProps: ["data", "error"],
  });
}

/** Hook to add a query version history entry. */
export function useAddQueryVersionHistory() {
  const queryClient = useQueryClient();

  return useMutation<SqluiCore.QueryVersionEntry, void, Omit<SqluiCore.QueryVersionEntry, "id" | "createdAt">>(
    (entry) => dataApi.addQueryVersionHistory(entry),
    {
      onSuccess: () => {
        queryClient.invalidateQueries([QUERY_KEY]);
      },
    },
  );
}

/** Hook to delete a single query version history entry. */
export function useDeleteQueryVersionHistory() {
  const queryClient = useQueryClient();

  return useMutation<void, void, string>((entryId) => dataApi.deleteQueryVersionHistory(entryId), {
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEY]);
    },
  });
}

/** Hook to clear all query version history entries. */
export function useClearQueryVersionHistory() {
  const queryClient = useQueryClient();

  return useMutation<void, void, void>(() => dataApi.clearQueryVersionHistory(), {
    onSuccess: () => {
      queryClient.invalidateQueries([QUERY_KEY]);
    },
  });
}

/**
 * Normalizes a SQL string for deduplication by trimming whitespace and collapsing runs.
 * @param sql - The raw SQL string.
 * @returns The normalized SQL string.
 */
export function normalizeSql(sql: string): string {
  return sql.trim().replace(/\s+/g, " ");
}
