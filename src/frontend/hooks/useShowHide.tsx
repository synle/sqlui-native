import { QueryClient, useQuery, useQueryClient } from 'react-query';
import { SessionStorageConfig } from 'src/frontend/data/config';
import { SqluiFrontend } from 'typings';

const QUERY_KEY_TREEVISIBLES = 'treeVisibles';
// used for show and hide the sidebar trees
let _treeVisibles = SessionStorageConfig.get<SqluiFrontend.TreeVisibilities>(
  'clientConfig/cache.treeVisibles',
  {},
);

export function useShowHide() {
  const queryClient = useQueryClient();

  const { data: visibles, isLoading: loading } = useQuery(
    QUERY_KEY_TREEVISIBLES,
    () => _treeVisibles,
    {
      onSuccess: (data) =>
        SessionStorageConfig.set('clientConfig/cache.treeVisibles', _treeVisibles),
    },
  );

  const onToggle = (key: string, isVisible?: boolean) => {
    if (isVisible === undefined) {
      _treeVisibles[key] = !_treeVisibles[key];
    } else {
      _treeVisibles[key] = isVisible;
    }

    _treeVisibles = { ..._treeVisibles };

    queryClient.invalidateQueries(QUERY_KEY_TREEVISIBLES);
  };

  const onClear = () => {
    _treeVisibles = {};

    queryClient.invalidateQueries(QUERY_KEY_TREEVISIBLES);
  };

  return {
    visibles: visibles || {},
    onToggle,
    onClear,
  };
}
