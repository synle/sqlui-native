import { Sqlui, SqluiNative } from 'typings';

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

export class ProxyApi {
  static getMetaData() {
    return _fetch<Sqlui.ConnectionMetaData[]>(`/api/metadata`);
  }

  static deleteConnection(connectionId: string) {
    return _fetch<void>(`/api/connection/${connectionId}`, {
      method: 'delete',
    });
  }

  static upsertConnection(newConnection: Sqlui.CoreConnectionProps) {
    const connectionId = newConnection.id;
    if (connectionId) {
      return _fetch<Sqlui.ConnectionProps>(`/api/connection/${connectionId}`, {
        method: 'put',
        body: JSON.stringify(newConnection),
      });
    } else {
      return _fetch<Sqlui.ConnectionProps>(`/api/connection`, {
        method: 'post',
        body: JSON.stringify(newConnection),
      });
    }
  }

  static execute(query?: SqluiNative.ConnectionQuery) {
    return _fetch<Sqlui.Result>(`/api/connection/${query?.connectionId}/execute`, {
      method: 'post',
      body: JSON.stringify({
        database: query?.databaseId,
        sql: query?.sql,
      }),
    });
  }

  static reconnect(connectionId: string) {
    return _fetch<Sqlui.ConnectionMetaData>(`/api/connection/${connectionId}/connect`, {
      method: 'post',
    });
  }

  static test(connection: Sqlui.CoreConnectionProps) {
    return _fetch<Sqlui.CoreConnectionMetaData>(`/api/connection/test`, {
      method: 'post',
      body: JSON.stringify(connection),
    });
  }
}

// selectively pick up which api to use...
export default ProxyApi;
