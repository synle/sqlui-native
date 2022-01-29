import { SqluiCore, SqluiFrontend } from 'typings';
import { SessionStorageConfig } from 'src/data/config';

let instanceId: string = 'mocked-server';
try {
  // @ts-ignore
  if (window.isElectron) {
    instanceId = SessionStorageConfig.get<string>('api.instanceId', '');
    if (!instanceId) {
      instanceId = `instanceId.${Date.now()}.${Math.random() * 1000}`;
    }
  }

  // persist this instance id
  SessionStorageConfig.set('api.instanceId', instanceId);
} catch (err) {
  //@ts-ignore
}

// @ts-ignore
function _fetch<T>(...inputs) {
  let { headers, ...restInput } = inputs[1] || {};

  headers = headers || {};
  headers = {
    ...headers,
    ...{ instanceid: instanceId, 'Content-Type': 'application/json', Accept: 'application/json' },
  };

  restInput = restInput || {};

  return fetch(inputs[0], {
    ...restInput,
    headers,
  })
    .then(async (r) => {
      const response = await r.text();

      let responseToUse;
      try {
        responseToUse = JSON.parse(response);
      } catch (err) {
        responseToUse = response;
      }

      return r.ok ? responseToUse : Promise.reject(responseToUse);
    })
    .then((r) => {
      const res: T = r;
      return res;
    });
}

export class ProxyApi {
  static getMetaData() {
    return _fetch<SqluiCore.ConnectionMetaData[]>(`/api/metadata`);
  }

  static getConnections() {
    return _fetch<SqluiCore.ConnectionProps[]>(`/api/connections`);
  }

  static getConnection(connectionId: string) {
    return _fetch<SqluiCore.ConnectionProps>(`/api/connection/${connectionId}`);
  }

  static getConnectionDatabases(connectionId: string) {
    return _fetch<SqluiCore.DatabaseMetaData[]>(`/api/connection/${connectionId}/databases`);
  }

  static getConnectionTables(connectionId: string, databaseId: string) {
    return _fetch<SqluiCore.TableMetaData[]>(
      `/api/connection/${connectionId}/database/${databaseId}/tables`,
    );
  }

  static getConnectionColumns(connectionId: string, databaseId: string, tableId: string) {
    return _fetch<SqluiCore.ColumnMetaData[]>(
      `/api/connection/${connectionId}/database/${databaseId}/table/${tableId}/columns`,
    );
  }

  static deleteConnection(connectionId: string) {
    return _fetch<string>(`/api/connection/${connectionId}`, {
      method: 'delete',
    }).then(() => connectionId);
  }

  static upsertConnection(newConnection: SqluiCore.CoreConnectionProps) {
    const connectionId = newConnection.id;
    if (connectionId) {
      return _fetch<SqluiCore.ConnectionProps>(`/api/connection/${connectionId}`, {
        method: 'put',
        body: JSON.stringify(newConnection),
      });
    } else {
      return _fetch<SqluiCore.ConnectionProps>(`/api/connection`, {
        method: 'post',
        body: JSON.stringify(newConnection),
      });
    }
  }

  static execute(query?: SqluiFrontend.ConnectionQuery) {
    return _fetch<SqluiCore.Result>(`/api/connection/${query?.connectionId}/execute`, {
      method: 'post',
      body: JSON.stringify({
        database: query?.databaseId,
        sql: query?.sql,
      }),
    });
  }

  static reconnect(connectionId: string) {
    return _fetch<SqluiCore.ConnectionMetaData>(`/api/connection/${connectionId}/connect`, {
      method: 'post',
    });
  }

  static test(connection: SqluiCore.CoreConnectionProps) {
    return _fetch<SqluiCore.CoreConnectionMetaData>(`/api/connection/test`, {
      method: 'post',
      body: JSON.stringify(connection),
    });
  }
}

// selectively pick up which api to use...
export default ProxyApi;
