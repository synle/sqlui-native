import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";
import { SqluiCore } from "typings";

/** React Query cache key for data snapshots. */
const QUERY_KEY_DATA_SNAPSHOT = `dataSnapshot`;

/**
 * Hook to fetch all data snapshots.
 * @returns React Query result containing an array of data snapshots.
 */
export function useGetDataSnapshots() {
  return useQuery([QUERY_KEY_DATA_SNAPSHOT], dataApi.getDataSnapshots, {
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to fetch a single data snapshot by ID.
 * @param dataSnapshotId - The snapshot ID to fetch.
 * @returns React Query result containing the snapshot or null.
 */
export function useGetDataSnapshot(dataSnapshotId?: string) {
  return useQuery([QUERY_KEY_DATA_SNAPSHOT, dataSnapshotId], () => (dataSnapshotId ? dataApi.getDataSnapshot(dataSnapshotId) : null), {
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to create a new data snapshot.
 * @returns Mutation that accepts snapshot data with required values and description.
 */
export function useAddDataSnapshot() {
  return useMutation<
    SqluiCore.DataSnapshot,
    void,
    Partial<SqluiCore.DataSnapshot> & Required<Pick<SqluiCore.DataSnapshot, "values" | "description">>
  >(async (newDataSnapshot) => {
    if (newDataSnapshot) {
      return dataApi.addDataSnapshot(newDataSnapshot);
    }
    throw new Error("newDataSnapshot is empty");
  });
}

/**
 * Hook to delete a data snapshot by ID. Invalidates the snapshot cache on success.
 * @returns Mutation that accepts a snapshot ID to delete.
 */
export function useDeleteDataSnapshot() {
  const queryClient = useQueryClient();
  return useMutation<void, void, string>(
    async (dataSnapshotId) => {
      if (dataSnapshotId) {
        return dataApi.deleteDataSnapshot(dataSnapshotId);
      }
      throw new Error("dataSnapshotId is empty");
    },
    {
      onSettled: () => {
        queryClient.invalidateQueries([QUERY_KEY_DATA_SNAPSHOT]);
      },
    },
  );
}
