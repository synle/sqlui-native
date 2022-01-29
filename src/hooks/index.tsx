import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { SqluiCore, SqluiFrontend } from 'typings';
import dataApi from 'src/data/api';
import Config from 'src/data/config';

const QUERY_KEY_ALL_CONNECTIONS = 'qk.connections';
const QUERY_KEY_TREEVISIBLES = 'qk.treeVisibles';
const QUERY_KEY_QUERIES = 'qk.queries';
const QUERY_KEY_RESULTS = 'qk.results';

// @ts-ignore
function _fetch<T>(...inputs) {
  let { headers, ...restInput } = inputs[1] || {};

  headers = headers || {};
  headers = { ...headers, ...{ 'Content-Type': 'application/json', Accept: 'application/json' } };

  restInput = restInput || {};

  return fetch(inputs[0], {
    ...restInput,
    headers,
  })
    .then(async (r) => {
      if (!r.ok) {
        throw r;
      }
      let response = await r.text();
      try {
        return JSON.parse(response);
      } catch (err) {
        return response;
      }
    })
    .then((r) => {
      const res: T = r;
      return res;
    });
}

export function useGetConnections() {
  return useQuery([QUERY_KEY_ALL_CONNECTIONS], dataApi.getConnections);
}

export function useGetConnectionById(connectionId?: string) {
  return useQuery(
    [connectionId, 'Definition'],
    () => (!connectionId ? undefined : dataApi.getConnection(connectionId)),
    {
      enabled: !!connectionId,
    },
  );
}

export function useUpsertConnection() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ConnectionProps, void, SqluiCore.CoreConnectionProps>(
    dataApi.upsertConnection,
    {
      onSuccess: async (newConnection) => {
        queryClient.invalidateQueries(newConnection.id);
        queryClient.invalidateQueries(QUERY_KEY_ALL_CONNECTIONS);

        queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(
          QUERY_KEY_ALL_CONNECTIONS,
          (oldData) => {
            // find that entry
            let isNew = true;
            oldData = oldData?.map((connection) => {
              if (connection.id === newConnection.id) {
                isNew = false;
                return {
                  ...connection,
                  ...newConnection,
                };
              }
              return connection;
            });

            if (isNew) {
              oldData?.push({
                ...newConnection,
              });
            }

            return oldData;
          },
        );

        return newConnection;
      },
    },
  );
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();

  return useMutation<string, void, string>(dataApi.deleteConnection, {
    onSuccess: async (deletedConnectionId) => {
      queryClient.invalidateQueries(deletedConnectionId);
      queryClient.invalidateQueries(QUERY_KEY_ALL_CONNECTIONS);

      queryClient.setQueryData<SqluiCore.ConnectionProps[] | undefined>(
        QUERY_KEY_ALL_CONNECTIONS,
        (oldData) => {
          return oldData?.filter((connection) => connection.id !== deletedConnectionId);
        },
      );

      return deletedConnectionId;
    },
  });
}

export function useDuplicateConnection() {
  const { mutateAsync: upsertConnection, isLoading } = useUpsertConnection();

  return {
    mutateAsync: (connection: SqluiCore.CoreConnectionProps) => {
      // delete the id - so we can duplicate
      const duplicatedConnection = {
        name: `Conn ${new Date().toLocaleString()}`,
        connection: connection.connection,
      };
      upsertConnection(duplicatedConnection);
    },
    isLoading,
  };
}

export function useImportConnection() {
  const { mutateAsync: upsertConnection, isLoading } = useUpsertConnection();

  return {
    mutateAsync: (connection: SqluiCore.CoreConnectionProps) => {
      // delete the id - so we can duplicate
      const duplicatedConnection = {
        name: `Imported Conn ${new Date().toLocaleString()}`,
        connection: connection.connection,
      };
      upsertConnection(duplicatedConnection);
    },
    isLoading,
  };
}

export function useGetDatabases(connectionId?: string) {
  const enabled = !!connectionId;

  return useQuery(
    [connectionId, 'databases'],
    () => (!enabled ? undefined : dataApi.getConnectionDatabases(connectionId)),
    {
      enabled,
    },
  );
}

export function useGetTables(connectionId: string, databaseId: string) {
  const enabled = !!connectionId && !!databaseId;

  return useQuery(
    [connectionId, databaseId, 'tables'],
    () => (!enabled ? undefined : dataApi.getConnectionTables(connectionId, databaseId)),
    {
      enabled,
    },
  );
}

export function useGetColumns(connectionId?: string, databaseId?: string, tableId?: string) {
  const enabled = !!connectionId && !!databaseId && !!tableId;

  return useQuery(
    [connectionId, databaseId, tableId, 'columns'],
    () => (!enabled ? undefined : dataApi.getConnectionColumns(connectionId, databaseId, tableId)),
    {
      enabled,
    },
  );
}

export function useExecute(query?: SqluiFrontend.ConnectionQuery) {
  const queryClient = useQueryClient();
  const { id, connectionId, sql, databaseId, lastExecuted } = query || {};
  const enabled = query && !!sql && !!connectionId && !!lastExecuted;

  return useQuery(
    [QUERY_KEY_RESULTS, `${QUERY_KEY_RESULTS}_${id}`, id, connectionId, databaseId, lastExecuted],
    () => dataApi.execute(query),
    {
      enabled,
      onSettled: (results, error) => {
        if (results || !error) {
          // if we have any one of these keywords, let's refresh the table...
          const KEYWORDS_TO_REFRESH_CONNECTION = [
            'DROP TABLE',
            'CREATE TABLE',
            'ALTER TABLE',
            'DROP COLUMN',
          ];
          const shouldRefreshConnection = KEYWORDS_TO_REFRESH_CONNECTION.some((keyword) =>
            query?.sql?.toUpperCase()?.includes(keyword),
          );

          if (shouldRefreshConnection) {
            queryClient.invalidateQueries(connectionId);
            queryClient.invalidateQueries(QUERY_KEY_ALL_CONNECTIONS);
          }
        }
      },
    },
  );
}

export function useRetryConnection() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.ConnectionMetaData, SqluiCore.ConnectionMetaData, string>(
    dataApi.reconnect,
    {
      onSettled: async (newSuccessConnection, newFailedConnection) => {
        // NOTE: here we used settled, because if the connection
        // went bad, we want to also refresh the data
        queryClient.invalidateQueries(QUERY_KEY_ALL_CONNECTIONS);

        queryClient.setQueryData<SqluiCore.ConnectionMetaData[] | undefined>(
          QUERY_KEY_ALL_CONNECTIONS,
          (oldData) => {
            // find that entry
            oldData = oldData?.map((connection) => {
              if (connection.id === newSuccessConnection?.id) {
                // good connnection
                queryClient.invalidateQueries(newSuccessConnection.id);
                return newSuccessConnection;
              }
              if (connection.id === newFailedConnection?.id) {
                // bad connection
                queryClient.invalidateQueries(newFailedConnection.id);
                return newFailedConnection;
              }
              return connection;
            });

            return oldData;
          },
        );
      },
    },
  );
}

export function useTestConnection() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.CoreConnectionMetaData, void, SqluiCore.CoreConnectionProps>(
    dataApi.test,
  );
}

// used for show and hide the sidebar trees
let _treeVisibles: SqluiFrontend.TreeVisibilities = {};

export function useShowHide() {
  const queryClient = useQueryClient();

  const { data: visibles, isLoading: loading } = useQuery(
    QUERY_KEY_TREEVISIBLES,
    () => _treeVisibles,
  );

  const onToggle = (key: string, isVisible?: boolean) => {
    if (isVisible === undefined) {
      _treeVisibles[key] = !_treeVisibles[key];
    } else {
      _treeVisibles[key] = isVisible;
    }
    // queryClient.invalidateQueries(QUERY_KEY_TREEVISIBLES);
    queryClient.setQueryData<SqluiFrontend.TreeVisibilities | undefined>(
      QUERY_KEY_TREEVISIBLES,
      () => _treeVisibles,
    );
  };

  return {
    visibles: visibles || {},
    onToggle,
  };
}

let _connectionQueries = Config.get<SqluiFrontend.ConnectionQuery[]>(
  'cache.connectionQueries',
  [],
).map((query) => {
  delete query.lastExecuted; // this is to stop the query from automatically triggered
  return query;
});

function _useConnectionQueries() {
  return useQuery(QUERY_KEY_QUERIES, () => _connectionQueries, {
    onSuccess: (data) => {
      Config.set('cache.connectionQueries', data);
    },
  });
}

export function useConnectionQueries() {
  const queryClient = useQueryClient();

  const { data: queries, isLoading, isFetching } = _useConnectionQueries();

  function _invalidateQueries() {
    // queryClient.invalidateQueries(QUERY_KEY_QUERIES);
    queryClient.setQueryData<SqluiFrontend.ConnectionQuery[] | undefined>(
      QUERY_KEY_QUERIES,
      () => _connectionQueries,
    );
  }

  const onAddQuery = (query?: SqluiFrontend.ConnectionQuery) => {
    const newId = `query.${Date.now()}.${Math.floor(Math.random() * 10000000000000000)}`;

    let newQuery: SqluiFrontend.ConnectionQuery;
    if (!query) {
      newQuery = {
        id: newId,
        name: `Query ${new Date().toLocaleString()}`,
        sql: '',
        selected: true,
      };
    } else {
      newQuery = {
        ...query,
        id: newId,
        name: `Duplicated Query ${new Date().toLocaleString()}`,
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

    _invalidateQueries();
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

  const onChangeQuery = (
    queryId: string | undefined,
    key: keyof SqluiFrontend.ConnectionQuery,
    value?: string,
  ) => {
    const query = queries?.find((q) => q.id === queryId);

    if (!query || !query) {
      return;
    }

    //@ts-ignore
    _connectionQueries = [..._connectionQueries].map((query) => {
      if (query.id === queryId) {
        return {
          ...query,
          ...{ [key]: value || '' },
        };
      }

      return query;
    });
    _invalidateQueries();
  };

  const onExecuteQuery = (queryId?: string) => {
    onChangeQuery(queryId, 'lastExecuted', `${Date.now()}`);
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

    onAddQuery(query);
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
    onExecuteQuery,
    onDuplicateQuery,
    onImportQuery,
  };
}

export function useConnectionQuery(queryId: string) {
  const queryClient = useQueryClient();

  const { queries, onChangeQuery, onExecuteQuery, onDeleteQuery, isLoading, isFetching } =
    useConnectionQueries();

  const query = queries?.find((q) => q.id === queryId);

  const onExecute = () => onExecuteQuery(query?.id);

  const onChange = (key: keyof SqluiFrontend.ConnectionQuery, value?: string) =>
    onChangeQuery(query?.id, key, value);

  const onDelete = () => onDeleteQuery(query?.id);

  return {
    isLoading,
    isFetching,
    query,
    onExecute,
    onChange,
    onDelete,
  };
}

export function useActiveConnectionQuery() {
  const queryClient = useQueryClient();

  const { queries, onChangeQuery, onExecuteQuery, onDeleteQuery, isLoading, isFetching } =
    useConnectionQueries();

  const query = queries?.find((q) => q.selected);

  const onExecute = () => onExecuteQuery(query?.id);

  const onChange = (key: keyof SqluiFrontend.ConnectionQuery, value?: string) =>
    onChangeQuery(query?.id, key, value);

  const onDelete = () => onDeleteQuery(query?.id);

  return {
    isLoading,
    isFetching,
    query,
    onExecute,
    onChange,
    onDelete,
  };
}

// for exporting
export function getExportedConnection(connection: SqluiCore.ConnectionProps) {
  const { dialect, databases, status, ...dataToExport } = connection;
  return { _type: 'connection', ...dataToExport };
}

export function getExportedQuery(query: SqluiFrontend.ConnectionQuery) {
  const { selected, lastExecuted, ...dataToExport } = query;
  return { _type: 'query', ...dataToExport };
}
