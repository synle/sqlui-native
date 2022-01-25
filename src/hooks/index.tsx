import React, { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { Optional } from 'utility-types';

type ConnectionProps = {
  id: string;
  connection: string;
  name: string;
  [index: string]: any;
};

type AddConnectionProps = {
  connection: string;
  name: string;
  [index: string]: any;
};

type SqlColumn = {
  type: string;
  allowNull: boolean;
  defaultValue?: string;
  comment?: string;
  special?: string;
  primaryKey: boolean;
};

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
  return useQuery(['connection', 'metadata'], () => _fetch<ConnectionProps[]>(`/api/metadata`));
}

export function useGetConnections() {
  return useQuery(['connection'], () => _fetch<ConnectionProps[]>(`/api/connections`));
}

export function useGetConnection(connectionId?: string) {
  return useQuery(['connection', connectionId], () =>
    _fetch<ConnectionProps>(`/api/connection/${connectionId}`, { enabled: !!connectionId }),
  );
}

export function useUpsertConnection() {
  return useMutation<ConnectionProps, void, AddConnectionProps, void>((newConnection) => {
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
  });
}

export function useDeleteConnection() {
  return useMutation<void, void, string, void>((deleteConnectionId) =>
    _fetch(`/api/connection/${deleteConnectionId}`, {
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
    _fetch<{ [index: string]: SqlColumn }>(
      `/api/connection/${connectionId}/database/${databaseId}/table/${tableId}/columns`,
    ),
  );
}

export function useExecute(connectionId: string, sql: string, databaseId?: string) {
  return useQuery(
    ['connection', connectionId, 'database', databaseId, 'table'],
    () =>
      _fetch(`/api/connection/${connectionId}/execute`, {
        method: 'post',
        body: JSON.stringify({
          database: databaseId,
          sql,
        }),
      }),
    {
      enabled: !!sql,
    },
  );
}

export function useShowHide() {
  const [visibles, setVisibles] = useState<{ [index: string]: boolean }>({});

  const onToggle = (key: string) => {
    //@ts-ignore
    visibles[key] = !visibles[key];
    setVisibles({ ...visibles });
  };

  return {
    visibles,
    onToggle,
  };
}
