import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import dataApi from 'src/frontend/data/api';
import { useUpsertConnection } from 'src/frontend/hooks/useConnection';
import { useConnectionQueries } from 'src/frontend/hooks/useConnectionQuery';
import { SqluiCore } from 'typings';

const QUERY_KEY_DATA_ITEM = `dataItem`;

export function useDataItem(windowId?: string) {
  return useQuery([QUERY_KEY_DATA_ITEM, windowId], () => windowId ? dataApi.getDataItem(windowId) : null, {select: (resp) => resp?.values})
}



export function useAddDataItem(windowId?: string) {
  const queryClient = useQueryClient();

  return useMutation<void, void, any>(async (newDataItem) => {
    if(windowId && newDataItem){
      await dataApi.updateDataItem(windowId, newDataItem)
    }
  });
}
