import { SqluiCore, SqluiFrontend } from 'typings';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import dataApi from 'src/frontend/data/api';

const QUERY_KEY_DATA_SNAPSHOT = `dataSnapshot`;

export function useGetDataSnapshots() {
  return useQuery(
    [QUERY_KEY_DATA_SNAPSHOT],
    () => dataApi.getDataSnapshots,
  );
}

export function useGetDataSnapshot(dataSnapshotId?: string) {
  return useQuery(
    [QUERY_KEY_DATA_SNAPSHOT, dataSnapshotId],
    () => (dataSnapshotId ? dataApi.getDataSnapshot(dataSnapshotId) : null),
  );
}

export function useAddDataSnapshot() {
  return useMutation<SqluiCore.DataSnapshot, void, Partial<SqluiCore.DataSnapshot> & Required<Pick<SqluiCore.DataSnapshot, 'values' | 'description'>>>(async (newDataSnapshot) => {
    if (newDataSnapshot) {
      return dataApi.addDataSnapshot(newDataSnapshot);
    }
    throw 'newDataSnapshot is empty'
  });
}

export function useDeleteDataSnapshot() {
  return useMutation<void, void, string>(async (dataSnapshotId) => {
    if (dataSnapshotId) {
      return dataApi.deleteDataSnapshot(dataSnapshotId);
    }
    throw 'dataSnapshotId is empty'
  });
}
