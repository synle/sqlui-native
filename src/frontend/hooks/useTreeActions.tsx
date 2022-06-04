import {useCallback} from 'react';
import { QueryClient, useQuery, useQueryClient } from 'react-query';

const QUERY_KEY_TREE_ACTIONS = 'treeActions';

type TreeActionProps = {
  showContextMenu: boolean;
  onSelectCallback?: (connectionId?: string, databaseId?: string, tableId?: string) => void;
}

// used for show and hide the sidebar trees
let _treeActions : TreeActionProps = {
  showContextMenu: true,
  onSelectCallback: () => {}
}

export function useTreeActions() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    QUERY_KEY_TREE_ACTIONS,
    () => _treeActions
  );

  const setTreeActions = useCallback((newTreeActionProps: Partial<TreeActionProps>) => {
    _treeActions.showContextMenu = newTreeActionProps.showContextMenu || false;
    _treeActions.onSelectCallback= newTreeActionProps.onSelectCallback || undefined;
    _treeActions = {..._treeActions}


    queryClient.setQueryData<TreeActionProps | undefined>(
      QUERY_KEY_TREE_ACTIONS,
      () => _treeActions,
    );
  },[]);

  return {
    isLoading,
    data: data || _treeActions,
    setTreeActions
  };
}
