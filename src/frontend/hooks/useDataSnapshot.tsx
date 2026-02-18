import { useMutation, useQuery, useQueryClient } from 'src/frontend/utils/reactQueryUtils';
import dataApi from 'src/frontend/data/api';
import { SqluiCore } from 'typings';

const QUERY_KEY_DATA_SNAPSHOT = `dataSnapshot`;

export function useGetDataSnapshots() {
  return useQuery([QUERY_KEY_DATA_SNAPSHOT], dataApi.getDataSnapshots);
}

export function useGetDataSnapshot(dataSnapshotId?: string) {
  return useQuery([QUERY_KEY_DATA_SNAPSHOT, dataSnapshotId], () =>
    dataSnapshotId ? dataApi.getDataSnapshot(dataSnapshotId) : null,
  );
}

export function useAddDataSnapshot() {
  const queryClient = useQueryClient();
  return useMutation<
    SqluiCore.DataSnapshot,
    void,
    Partial<SqluiCore.DataSnapshot> &
      Required<Pick<SqluiCore.DataSnapshot, 'values' | 'description'>>
  >(async (newDataSnapshot) => {
    if (newDataSnapshot) {
      return dataApi.addDataSnapshot(newDataSnapshot);
    }
    throw 'newDataSnapshot is empty';
  });
}

export function useDeleteDataSnapshot() {
  const queryClient = useQueryClient();
  return useMutation<void, void, string>(
    async (dataSnapshotId) => {
      if (dataSnapshotId) {
        return dataApi.deleteDataSnapshot(dataSnapshotId);
      }
      throw 'dataSnapshotId is empty';
    },
    {
      onSettled: () => {
        queryClient.invalidateQueries([QUERY_KEY_DATA_SNAPSHOT]);
      },
    },
  );
}
