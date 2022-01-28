import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Sqlui, SqluiNative } from 'typings';
import dataApi from 'src/data/api';

const QUERY_KEY_CONNECTIONS = 'connections';
const QUERY_KEY_TREEVISIBLES = 'treeVisibles';
const QUERY_KEY_QUERIES = 'queries';
const QUERY_KEY_RESULTS = 'results';

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

let _metaData: Sqlui.ConnectionMetaData[] = [];
try {
  _metaData = JSON.parse(window.localStorage.getItem('cache.metadata') || '');
} catch (err) {
  _metaData = [];
}

export function useGetMetaData() {
  return useQuery(QUERY_KEY_CONNECTIONS, dataApi.getMetaData, {
    initialData: _metaData,
    onSuccess: (data) => {
      if (data && Object.keys(data).length > 0) {
        window.localStorage.setItem('cache.metadata', JSON.stringify(data));
      }
    },
  });
}

export function useGetAvailableDatabaseConnections(metaData?: Sqlui.ConnectionMetaData[]) {
  const connections = metaData || [];
  const res: SqluiNative.AvailableConnectionProps[] = [];

  for (const connection of connections) {
    const connectionId = connection.id;
    for (const database of connection.databases) {
      const databaseId = database.name as string;

      res.push({
        connectionId,
        databaseId,
        id: [connectionId, databaseId].join(' << '),
        label: [connection.name, database.name].join(' > '),
      });
    }
  }

  return res;
}

export function useGetConnection(connectionId?: string, metaData?: Sqlui.ConnectionMetaData[]) {
  return metaData?.find((connection) => connection.id === connectionId);
}

export function useUpsertConnection() {
  const queryClient = useQueryClient();
  return useMutation<Sqlui.ConnectionProps, void, Sqlui.CoreConnectionProps>(
    dataApi.upsertConnection,
    {
      onSuccess: async (newConnection) => {
        queryClient.invalidateQueries('connection');

        queryClient.setQueryData<Sqlui.ConnectionProps[] | undefined>(
          QUERY_KEY_CONNECTIONS,
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
      queryClient.invalidateQueries('connection');

      queryClient.setQueryData<Sqlui.ConnectionProps[] | undefined>(
        QUERY_KEY_CONNECTIONS,
        (oldData) => {
          return oldData?.filter((connection) => connection.id !== deletedConnectionId);
        },
      );

      return deletedConnectionId;
    },
  });
}

export function useGetDatabases(connectionId: string, metaData?: Sqlui.ConnectionMetaData[]) {
  return metaData?.find((connection) => connection.id === connectionId)?.databases;
}

export function useGetTables(
  connectionId: string,
  databaseId: string,
  metaData?: Sqlui.ConnectionMetaData[],
) {
  const databases = useGetDatabases(connectionId, metaData);
  return databases?.find((database) => database.name === databaseId)?.tables;
}

export function useGetColumns(
  connectionId: string,
  databaseId: string,
  tableId: string,
  metaData?: Sqlui.ConnectionMetaData[],
) {
  const tables = useGetTables(connectionId, databaseId, metaData);
  return tables?.find((table) => table.name === tableId)?.columns;
}

export function useExecute(query?: SqluiNative.ConnectionQuery) {
  const { id, connectionId, sql, databaseId, lastExecuted } = query || {};
  const enabled = query && !!sql && !!connectionId && !!databaseId && !!lastExecuted;

  return useQuery(
    [QUERY_KEY_RESULTS, `${QUERY_KEY_RESULTS}_${id}`, id, connectionId, databaseId, lastExecuted],
    () => dataApi.execute(query),
    {
      enabled,
    },
  );
}

export function useRetryConnection() {
  const queryClient = useQueryClient();
  return useMutation<Sqlui.ConnectionMetaData, void, string>(dataApi.reconnect, {
    onSuccess: async (newConnection) => {
      queryClient.invalidateQueries('connection');

      queryClient.setQueryData<Sqlui.ConnectionMetaData[] | undefined>(
        QUERY_KEY_CONNECTIONS,
        (oldData) => {
          // find that entry
          oldData = oldData?.map((connection) => {
            if (connection.id === newConnection.id) {
              return newConnection;
            }
            return connection;
          });

          return oldData;
        },
      );

      return newConnection;
    },
  });
}

export function useTestConnection() {
  const queryClient = useQueryClient();
  return useMutation<Sqlui.CoreConnectionMetaData, void, Sqlui.CoreConnectionProps>(dataApi.test);
}

// used for show and hide the sidebar trees
let _treeVisibles: { [index: string]: boolean } = {};

export function useShowHide() {
  const queryClient = useQueryClient();

  const { data: visibles, isLoading: loading } = useQuery(
    QUERY_KEY_TREEVISIBLES,
    () => _treeVisibles,
  );

  const onToggle = (key: string) => {
    _treeVisibles[key] = !_treeVisibles[key];
    queryClient.invalidateQueries(QUERY_KEY_TREEVISIBLES);
  };

  return {
    visibles: visibles || {},
    onToggle,
  };
}

let _connectionQueries: SqluiNative.ConnectionQuery[];
try {
  _connectionQueries = JSON.parse(window.localStorage.getItem('cache.connectionQueries') || '');
} catch (err) {
  _connectionQueries = [
    {
      id: '1',
      name: 'Query #1',
      sql: '',
      selected: true,
    },
  ];
}

function _useConnectionQueries() {
  return useQuery(QUERY_KEY_QUERIES, () => _connectionQueries, {
    onSuccess: (data) => {
      if (data && Object.keys(data).length > 0) {
        window.localStorage.setItem('cache.connectionQueries', JSON.stringify(data));
      }
    },
  });
}

export function useConnectionQueries() {
  const queryClient = useQueryClient();

  const { data: queries, isLoading, isFetching } = _useConnectionQueries();

  const onAddQuery = () => {
    _connectionQueries = [
      ..._connectionQueries.map((q) => {
        q.selected = false;
        return q;
      }),
      {
        id: `${Date.now()}`,
        name: `Query ${new Date().toLocaleString()}`,
        sql: '',
        selected: true,
      },
    ];

    queryClient.invalidateQueries(QUERY_KEY_QUERIES);
  };

  const onDeleteQuery = (queryId: string) => {
    _connectionQueries = _connectionQueries.filter((q) => q.id !== queryId);
    queryClient.invalidateQueries(QUERY_KEY_QUERIES);
  };

  const onShowQuery = (queryId: string) => {
    _connectionQueries = _connectionQueries.map((q) => {
      q.selected = q.id === queryId;
      return q;
    });
    queryClient.invalidateQueries(QUERY_KEY_QUERIES);
  };

  const onChangeQuery = (
    queryId: string | undefined,
    key: keyof SqluiNative.ConnectionQuery,
    value?: string,
  ) => {
    const query = queries?.find((q) => q.id === queryId);

    if (!query || !query) {
      return;
    }

    //@ts-ignore
    query[key] = value || '';
    queryClient.invalidateQueries(QUERY_KEY_QUERIES);
  };

  const onExecuteQuery = (queryId?: string) => {
    const query = queries?.find((q) => q.id === queryId);

    if (!query || !query) {
      return;
    }

    query['lastExecuted'] = `${Date.now()}`;
    queryClient.invalidateQueries(QUERY_KEY_QUERIES);
    queryClient.invalidateQueries(`executeQuery.${query.id}`);
  };

  return {
    isLoading,
    isFetching,
    queries,
    onAddQuery,
    onDeleteQuery,
    onShowQuery,
    onChangeQuery,
    onExecuteQuery,
  };
}

export function useConnectionQuery(queryId: string) {
  const queryClient = useQueryClient();

  const { queries, onChangeQuery, onExecuteQuery, isLoading, isFetching } = useConnectionQueries();

  const query = queries?.find((q) => q.id === queryId);

  const onExecute = () => onExecuteQuery(query?.id);

  const onChange = (key: keyof SqluiNative.ConnectionQuery, value?: string) =>
    onChangeQuery(query?.id, key, value);

  return {
    isLoading,
    isFetching,
    query,
    onExecute,
    onChange,
  };
}

export function useActiveConnectionQuery() {
  const queryClient = useQueryClient();

  const { queries, onChangeQuery, onExecuteQuery, isLoading, isFetching } = useConnectionQueries();

  const query = queries?.find((q) => q.selected);

  const onExecute = () => onExecuteQuery(query?.id);

  const onChange = (key: keyof SqluiNative.ConnectionQuery, value?: string) =>
    onChangeQuery(query?.id, key, value);

  return {
    isLoading,
    isFetching,
    query,
    onExecute,
    onChange,
  };
}
