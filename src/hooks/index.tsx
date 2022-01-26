import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Sqlui } from 'typings';

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
    .then((r) => r.text())
    .then((r) => {
      try{
        return JSON.parse(r)
      } catch(err){
        return r;
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
  return useQuery(
    ['connection', 'all'],
    () => _fetch<Sqlui.ConnectionMetaData[]>(`/api/metadata`),
    {
      initialData: _metaData,
      onSuccess: (data) => {
        if (data && Object.keys(data).length > 0) {
          window.localStorage.setItem('cache.metadata', JSON.stringify(data));
        }
      },
    },
  );
}

interface AvailableConnectionProps {
  connectionId: string;
  databaseId: string;
  id: string;
  label: string;
}

export function useGetAvailableDatabaseConnections(metaData?: Sqlui.ConnectionMetaData[]) {
  const connections = metaData || [];
  const res: AvailableConnectionProps[] = [];

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

export function useGetConnection(connectionId?: string) {
  return useQuery(['connection', connectionId], () =>
    _fetch<Sqlui.ConnectionProps>(`/api/connection/${connectionId}`, { enabled: !!connectionId }),
  );
}

export function useUpsertConnection() {
  const queryClient = useQueryClient();

  const resp = useMutation<Sqlui.ConnectionProps, void, Sqlui.AddConnectionProps, void>(
    (newConnection) => {
      const connectionId = newConnection.id;
      if (connectionId) {
        return _fetch(`/api/connection/${connectionId}`, {
          method: 'put',
          body: JSON.stringify(newConnection),
        });
      } else {
        return _fetch(`/api/connection`, {
          method: 'post',
          body: JSON.stringify(newConnection),
        });
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('connection');
      },
    },
  );

  return resp;
}

export function useDeleteConnection() {
  return useMutation<void, void, string, void>((deleteConnectionId) =>
    _fetch<void>(`/api/connection/${deleteConnectionId}`, {
      method: 'delete',
    }),
  );
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

export function useExecute(query?: ConnectionQuery) {
  const { connectionId, sql, databaseId, lastExecuted } = query || {};
  const enabled = query && !!sql && !!connectionId && !!databaseId && !!lastExecuted;

  return useQuery(
    [`executeQuery.${query?.id}`, connectionId, databaseId, lastExecuted],
    () =>
      _fetch<Sqlui.Result>(`/api/connection/${connectionId}/execute`, {
        method: 'post',
        body: JSON.stringify({
          database: databaseId,
          sql,
        }),
      }),
    {
      enabled,
    },
  );
}

export function useAuthenticateConnection() {
  const queryClient = useQueryClient();

  return useMutation<void, void, string, void>(
    (connectionId) =>
      _fetch<void>(`/api/connection/${connectionId}/connect`, {
        method: 'post',
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('connection');
      },
    },
  );
}

// used for show and hide the sidebar trees
let _treeVisibles: { [index: string]: boolean } = {};

export function useShowHide() {
  const queryClient = useQueryClient();

  const { data: visibles, isLoading: loading } = useQuery('treeVisibles', () => _treeVisibles);

  const onToggle = (key: string) => {
    _treeVisibles[key] = !_treeVisibles[key];
    queryClient.invalidateQueries('treeVisibles');
  };

  return {
    visibles: visibles || {},
    onToggle,
  };
}

// connection queries
interface ConnectionQuery {
  id: string;
  name: string;
  connectionId?: string;
  databaseId?: string;
  sql: string;
  lastExecuted?: string;
  selected: boolean;
}

let _connectionQueries: ConnectionQuery[];
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
  return useQuery('connectionQueries', () => _connectionQueries, {
    onSuccess: (data) => {
      if (data && Object.keys(data).length > 0) {
        window.localStorage.setItem('cache.connectionQueries', JSON.stringify(data));
      }
    },
  });
}

export function useConnectionQueries() {
  const queryClient = useQueryClient();

  const { data: queries, isLoading } = _useConnectionQueries();

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

    queryClient.invalidateQueries('connectionQueries');
  };

  const onDeleteQuery = (queryId: string) => {
    _connectionQueries = _connectionQueries.filter((q) => q.id !== queryId);
    queryClient.invalidateQueries('connectionQueries');
  };

  const onShowQuery = (queryId: string) => {
    _connectionQueries = _connectionQueries.map((q) => {
      q.selected = q.id === queryId;
      return q;
    });
    queryClient.invalidateQueries('connectionQueries');
  };

  const onChangeQuery = (queryId: string, key: keyof ConnectionQuery, value?: string) => {
    const query = queries?.find((q) => q.id === queryId);

    if (!query) {
      return;
    }

    //@ts-ignore
    query[key] = value || '';
    queryClient.invalidateQueries('connectionQueries');
  };

  return {
    isLoading,
    queries,
    onAddQuery,
    onDeleteQuery,
    onShowQuery,
    onChangeQuery,
  };
}

export function useConnectionQuery(queryId: string) {
  const queryClient = useQueryClient();

  const { data: queries, isLoading, isFetching } = _useConnectionQueries();

  const query = queries?.find((q) => q.id === queryId);

  const onExecute = () => {
    if (!query) {
      return;
    }
    query['lastExecuted'] = `${Date.now()}`;
    queryClient.invalidateQueries('connectionQueries');
    queryClient.invalidateQueries(`executeQuery.${query.id}`);
  };

  const onChange = (key: keyof ConnectionQuery, value?: string) => {
    if (!query) {
      return;
    }

    //@ts-ignore
    query[key] = value || '';
    queryClient.invalidateQueries('connectionQueries');
    queryClient.invalidateQueries(`executeQuery.${query.id}`);
  };

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

  const { data: queries, isLoading } = _useConnectionQueries();

  const query = queries?.find((q) => q.selected);

  const onExecute = () => {
    if (!query) {
      return;
    }
    query['lastExecuted'] = `${Date.now()}`;
    queryClient.invalidateQueries('connectionQueries');
    queryClient.invalidateQueries(`executeQuery.${query.id}`);
  };

  const onChange = (key: keyof ConnectionQuery, value?: string) => {
    if (!query) {
      return;
    }

    //@ts-ignore
    query[key] = value || '';
    queryClient.invalidateQueries('connectionQueries');
    queryClient.invalidateQueries(`executeQuery.${query.id}`);
  };

  return {
    isLoading,
    query,
    onExecute,
    onChange,
  };
}
