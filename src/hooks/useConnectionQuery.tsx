import { QueryClient, useQuery, useQueryClient } from 'react-query';
import dataApi from 'src/data/api';
import { SessionStorageConfig } from 'src/data/config';
import { getGeneratedRandomId, getUpdatedOrdersForList } from 'src/utils/commonUtils';
import { SqluiFrontend, SqluiCore } from 'typings';

const QUERY_KEY_QUERIES = 'queries';

// connection queries
let _connectionQueries: SqluiFrontend.ConnectionQuery[];

function _useConnectionQueries() {
  return useQuery(
    QUERY_KEY_QUERIES,
    async () => {
      if (!_connectionQueries) {
        // this is the first time
        // try pulling it in from sessionStorage
        _connectionQueries = SessionStorageConfig.get<SqluiFrontend.ConnectionQuery[]>(
          'clientConfig/cache.connectionQueries',
          [],
        );

        if (_connectionQueries.length === 0) {
          // if config failed, attempt to get it from the api
          try {
            _connectionQueries = await dataApi.getQueries();
          } catch (err) {}
        }

        // at the end we want to remove executionStart so the query won't be run again
        let toBeSelectedQuery = 0;
        _connectionQueries = _connectionQueries.map((query, idx) => {
          if (query.selected) {
            query.selected = false;
            toBeSelectedQuery = idx;
          }

          return query;
        });

        if (_connectionQueries[toBeSelectedQuery]) {
          _connectionQueries[toBeSelectedQuery].selected = true;
        }
      }

      return _connectionQueries;
    },
    {
      onSuccess: (data) => {
        SessionStorageConfig.set('clientConfig/cache.connectionQueries', data);
      },
    },
  );
}

export function useConnectionQueries() {
  const queryClient = useQueryClient();

  const { data: queries, isLoading, isFetching } = _useConnectionQueries();

  function _invalidateQueries() {
    queryClient.setQueryData<SqluiFrontend.ConnectionQuery[] | undefined>(
      QUERY_KEY_QUERIES,
      () => _connectionQueries,
    );
  }

  const onAddQuery = async (query?: SqluiCore.CoreConnectionQuery) => {
    const newId = getGeneratedRandomId(`queryId`);

    let newQuery: SqluiFrontend.ConnectionQuery;
    if (!query) {
      newQuery = {
        id: newId,
        name: `Query ${new Date().toLocaleString()}`,
        sql: '',
        selected: true,
      };
    } else {
      let newQueryName = query.name || `Query ${new Date().toLocaleString()}`;

      for (const query of _connectionQueries) {
        if (query.name === newQueryName) {
          // replace it with a new anme
          newQueryName = `Duplicated Query ${new Date().toLocaleString()}`;
        }
      }

      newQuery = {
        ...query,
        id: newId,
        name: newQueryName,
        selected: true,
      };
    }

    _connectionQueries = [
      ..._connectionQueries.map((q) => {
        q.selected = false;
        return q;
      }),
      newQuery,
    ];

    try {
      _invalidateQueries();
      dataApi.upsertQuery(newQuery);// make an api call to persists and this is fire and forget
    } catch (err) {}

    return newQuery;
  };

  const onDeleteQueries = (queryIds?: string[]) => {
    if (!queryIds || queryIds.length === 0) {
      return;
    }

    let toBeSelected = 0;
    if (queryIds.length === 1) {
      const [queryId] = queryIds;
      _connectionQueries = _connectionQueries.filter((q, idx) => {
        if (q.id !== queryId) {
          return true;
        }
        toBeSelected = Math.max(0, idx - 1);

        return false;
      });
    } else {
      _connectionQueries = _connectionQueries.filter((q, idx) => {
        if (queryIds.indexOf(q.id) >= 0) {
          return false;
        }

        return true;
      });
    }

    if (_connectionQueries[toBeSelected]) {
      _connectionQueries[toBeSelected].selected = true;
    }

    // make an api call to persists
    // this is fire and forget
    for (const queryId of queryIds) {
      // make api to delete the query
      dataApi.deleteQuery(queryId);
    }

    _invalidateQueries();
  };

  const onDeleteQuery = (queryId?: string) => queryId && onDeleteQueries([queryId]);

  const onShowQuery = (queryId: string) => {
    _connectionQueries = _connectionQueries.map((q) => {
      q.selected = q.id === queryId;
      return q;
    });
    _invalidateQueries();
  };

  const onChangeQuery = async (
    queryId: string | undefined,
    partials: SqluiFrontend.PartialConnectionQuery,
  ) => {
    if(!queryId){
      if(!queries || queries.length === 0){
        // this is an edge case where users already closed all the query tab
        const newQuery = await onAddQuery({
          id: getGeneratedRandomId(`queryId`),
          name: `Query ${new Date().toLocaleString()}`,
          ...partials
        });

        queryId = newQuery.id;
      }
    }

    const query = queries?.find((q) => q.id === queryId);

    if (!query || !query) {
      return;
    }

    _connectionQueries = [..._connectionQueries].map((query) => {
      if (query.id === queryId) {
        const newValue = {
          ...query,
          ...partials,
        };
        return newValue;
      }

      return query;
    });

    try {
      _invalidateQueries();
      dataApi.upsertQuery(query);// make an api call to persists and this is fire and forget
    } catch (err) {}
  };

  const onDuplicateQuery = (queryId?: string) => {
    const query = queries?.find((q) => q.id === queryId);

    if (!query || !query) {
      return;
    }

    onAddQuery(query);
  };

  const onImportQuery = (query?: SqluiFrontend.ConnectionQuery) => {
    if (!query || !query) {
      return;
    }

    return onAddQuery(query);
  };

  const onOrderingChange = (from: number, to: number) => {
    _connectionQueries = getUpdatedOrdersForList(_connectionQueries, from, to);
    _invalidateQueries();
  };

  return {
    isLoading,
    isFetching,
    queries,
    onAddQuery,
    onDeleteQuery,
    onDeleteQueries,
    onShowQuery,
    onChangeQuery,
    onDuplicateQuery,
    onImportQuery,
    onOrderingChange,
  };
}

export function useConnectionQuery(queryId: string) {
  const queryClient = useQueryClient();

  const { queries, onChangeQuery, onDeleteQuery, isLoading, isFetching } = useConnectionQueries();

  const query = queries?.find((q) => q.id === queryId);

  const onChange = (partials: SqluiFrontend.PartialConnectionQuery) =>
    onChangeQuery(query?.id, partials);

  const onDelete = () => onDeleteQuery(query?.id);

  return {
    isLoading,
    isFetching,
    query,
    onChange,
    onDelete,
  };
}

export function useActiveConnectionQuery() {
  const queryClient = useQueryClient();

  const { queries, onChangeQuery, onDeleteQuery, isLoading, isFetching } = useConnectionQueries();

  const query = queries?.find((q) => q.selected);

  const onChange = (partials: SqluiFrontend.PartialConnectionQuery) =>
    onChangeQuery(query?.id, partials);

  const onDelete = () => onDeleteQuery(query?.id);

  return {
    isLoading,
    isFetching,
    query,
    onChange,
    onDelete,
  };
}
