import {SqluiCore} from 'typings';
import {SqluiFrontend} from 'typings';
import {getCurrentSessionId} from 'src/data/session';
// @ts-ignore
async function _fetch<T>(...inputs) {
  let { headers, ...restInput } = inputs[1] || {};

  headers = headers || {};
  headers = {
    ...headers,
    ...{
      'sqlui-native-session-id': await getCurrentSessionId(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
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
    const { id } = newConnection;
    if (id) {
      return _fetch<SqluiCore.ConnectionProps>(`/api/connection/${id}`, {
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

  // queries endpoints
  static getQueries() {
    return _fetch<SqluiCore.ConnectionQuery[]>(`/api/queries`);
  }

  static upsertQuery(newQuery: SqluiCore.CoreConnectionQuery) {
    const { id } = newQuery;
    if (id) {
      return _fetch<SqluiCore.CoreConnectionQuery>(`/api/query/${newQuery.id}`, {
        method: 'put',
        body: JSON.stringify(newQuery),
      });
    } else {
      return _fetch<SqluiCore.CoreConnectionQuery>(`/api/query`, {
        method: 'post',
        body: JSON.stringify(newQuery),
      });
    }
  }

  static deleteQuery(queryId: string) {
    return _fetch<string>(`/api/query/${queryId}`, {
      method: 'delete',
    }).then(() => queryId);
  }

  // sessions api
  static getSessions() {
    return _fetch<SqluiCore.Session[]>(`/api/sessions`);
  }

  static upsertSession(newSession: SqluiCore.CoreSession) {
    const { id } = newSession;
    if (id) {
      return _fetch<SqluiCore.Session>(`/api/session/${newSession.id}`, {
        method: 'put',
        body: JSON.stringify(newSession),
      });
    } else {
      return _fetch<SqluiCore.Session>(`/api/session`, {
        method: 'post',
        body: JSON.stringify(newSession),
      });
    }
  }

  static deleteSession(sessionId: string) {
    return _fetch<string>(`/api/session/${sessionId}`, {
      method: 'delete',
    }).then(() => sessionId);
  }
}

// selectively pick up which api to use...
export default ProxyApi;