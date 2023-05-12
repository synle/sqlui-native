import { SqluiCore, SqluiFrontend } from 'typings';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import dataApi from 'src/frontend/data/api';

const QUERY_KEY_DATA_ITEM = `dataItem`;

export function useDataItem(dataItemGroupKey?: string) {
  return useQuery(
    [QUERY_KEY_DATA_ITEM, dataItemGroupKey],
    () => (dataItemGroupKey ? dataApi.getDataItem(dataItemGroupKey) : null),
  );
}
export function useAddDataItem() {
  const queryClient = useQueryClient();

  return useMutation<SqluiCore.RawDataItem, void, Partial<SqluiCore.RawDataItem> & Required<Pick<SqluiCore.RawDataItem, 'values' | 'description'>>>(async (newDataItem) => {
    if (newDataItem) {
      return dataApi.updateDataItem(newDataItem);
    }
    throw 'newDataItem is empty'
  });
}
