import { Sqlui, SqluiNative } from 'typings';
import {SessionStorageConfig} from 'src/data/config';

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
    return _fetch<Sqlui.ConnectionMetaData[]>(`/api/metadata`);
  }

  static deleteConnection(connectionId: string) {
    return _fetch<string>(`/api/connection/${connectionId}`, {
      method: 'delete',
    }).then(() => connectionId);
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
