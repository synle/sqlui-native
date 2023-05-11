import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import dataApi from 'src/frontend/data/api';
import { useUpsertConnection } from 'src/frontend/hooks/useConnection';
import { useConnectionQueries } from 'src/frontend/hooks/useConnectionQuery';
import { SqluiCore } from 'typings';

const QUERY_KEY_DATA_ITEM = `dataItem`;

export function useDataItem(dataItemGroupKey?: string) {
  return useQuery([QUERY_KEY_DATA_ITEM, dataItemGroupKey], () => dataItemGroupKey ? dataApi.getDataItem(dataItemGroupKey) : null, {select: (resp) => resp?.values})
}



export function useAddDataItem() {
  const queryClient = useQueryClient();

  return useMutation<void, void, [string, any]>(async ([dataItemGroupKey, newDataItem]) => {
    if(dataItemGroupKey && newDataItem){
      await dataApi.updateDataItem(dataItemGroupKey, newDataItem)
    }
  });
}
