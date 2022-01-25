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
    .then((r) => r.json())
    .then((r) => {
      const res: T = r;
      return res;
    });
}

export function useGetMetaData() {
  return useQuery(['connection', 'metadata'], () =>
    _fetch<Sqlui.ConnectionProps[]>(`/api/metadata`),
  );
}

export function useGetConnections() {
  return useQuery(['connection'], () => _fetch<Sqlui.ConnectionProps[]>(`/api/connections`));
}

export function useGetConnection(connectionId?: string) {
  return useQuery(['connection', connectionId], () =>
    _fetch<Sqlui.ConnectionProps>(`/api/connection/${connectionId}`, { enabled: !!connectionId }),
  );
}

export function useUpsertConnection() {
  return useMutation<Sqlui.ConnectionProps, void, Sqlui.AddConnectionProps, void>(
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
  );
}

export function useDeleteConnection() {
  return useMutation<void, void, string, void>((deleteConnectionId) =>
    _fetch<void>(`/api/connection/${deleteConnectionId}`, {
      method: 'delete',
    }),
  );
}

export function useGetDatabases(connectionId: string) {
  return useQuery(['connection', connectionId, 'databases'], () =>
    _fetch<string[]>(`/api/connection/${connectionId}/databases`),
  );
}

export function useGetTables(connectionId: string, databaseId: string) {
  return useQuery(['connection', connectionId, 'database', databaseId, 'tables'], () =>
    _fetch<string[]>(`/api/connection/${connectionId}/database/${databaseId}/tables`),
  );
}

export function useGetColumns(connectionId: string, databaseId: string, tableId: string) {
  return useQuery(['connection', connectionId, 'database', databaseId, 'table', tableId], () =>
    _fetch<{ [index: string]: Sqlui.Column }>(
      `/api/connection/${connectionId}/database/${databaseId}/table/${tableId}/columns`,
    ),
  );
}

export function useExecute(connectionId?: string, sql?: string, databaseId?: string) {
  return useQuery(
    ['connection', connectionId, 'database', databaseId, 'table'],
    () =>
      _fetch<Sqlui.Result>(`/api/connection/${connectionId}/execute`, {
        method: 'post',
        body: JSON.stringify({
          database: databaseId,
          sql,
        }),
      }),
    {
      enabled: !!sql && !!connectionId && !databaseId,
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
}

let _connectionQueries: ConnectionQuery[] = [
  {
    id: '1',
    name: 'Query #1',
    sql: '',
  },
];

export function useConnectionQueries() {
  const queryClient = useQueryClient();

  const { data: queries, isLoading } = useQuery('connectionQueries', () => _connectionQueries);

  const onAddQuery = () => {
    _connectionQueries.push({
      id: `${Date.now()}`,
      name: `Query ${new Date().toLocaleString()}`,
      sql: '',
    });
    queryClient.invalidateQueries('connectionQueries');
  };

  const onDeleteQuery = (queryId: string) => {
    _connectionQueries = _connectionQueries.filter((q) => q.id !== queryId);
    queryClient.invalidateQueries('connectionQueries');
  };

  return {
    isLoading,
    queries,
    onAddQuery,
    onDeleteQuery,
  };
}

export function useConnectionQuery(queryId: string) {
  const queryClient = useQueryClient();

  const { data: queries, isLoading } = useQuery('connectionQueries', () => _connectionQueries);

  const query = queries?.find((q) => q.id === queryId);

  const onExecute = () => {
    if(!query){
      return;
    }

    queryClient.invalidateQueries('connectionQueries');
  };

  const onChange = (key: keyof ConnectionQuery, value: string) => {
    if(!query){
      return;
    }
    query[key] = value;
    queryClient.invalidateQueries('connectionQueries');
  };

  return {
    isLoading,
    query,
    onExecute,
    onChange,
  };
}
