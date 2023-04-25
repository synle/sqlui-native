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
      notifyOnChangeProps: ['data', 'error'],
    },
  );

  const onToggle = (key: string, isVisible?: boolean) => {
    let newVisible: boolean;
    if (isVisible === undefined) {
      newVisible = !_treeVisibles[key];
    } else {
      newVisible = isVisible;
    }

    _updateVisibles({ ..._treeVisibles, ...{ [key]: newVisible } });

    queryClient.invalidateQueries(QUERY_KEY_TREEVISIBLES);
  };

  const onSet = (newTreeVisibles: SqluiFrontend.TreeVisibilities) => {
    _updateVisibles(newTreeVisibles);
  };

  const onClear = () => {
    _updateVisibles({});
  };

  function _updateVisibles(newTreeVisibles: SqluiFrontend.TreeVisibilities) {
    _treeVisibles = { ...newTreeVisibles };

    queryClient.setQueryData<SqluiFrontend.TreeVisibilities | undefined>(
      QUERY_KEY_TREEVISIBLES,
      () => ({ ..._treeVisibles }),
    );
  }

  return {
    visibles: visibles || {},
    onToggle,
    onClear,
    onSet,
  };
}
