import { SqluiCore, SqluiFrontend } from 'typings';
async function _fetch<T>(input: RequestInfo, initOptions?: RequestInit) {
  let { headers, ...restInput } = initOptions || {};

  headers = headers || {};
  headers = {
    ...headers,
    ...{
      'sqlui-native-session-id': sessionStorage.getItem('sqlui-native.sessionId') || '',
      'sqlui-native-window-id': sessionStorage.getItem('sqlui-native.windowId') || '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  restInput = restInput || {};

  return fetch(input, {
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
  static getConfigs() {
    return _fetch<SqluiCore.ServerConfigs>(`/api/configs`);
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
        sql: query?.sql,
        database: query?.databaseId,
        table: query?.tableId,
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

  static update(connections: SqluiCore.ConnectionProps[]) {
    return _fetch<SqluiCore.ConnectionProps[]>(`/api/connections`, {
      method: 'post',
      body: JSON.stringify(connections),
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
  static getSession() {
    return _fetch<SqluiCore.Session>(`/api/session`);
  }

  static getSessions() {
    return _fetch<SqluiCore.Session[]>(`/api/sessions`);
  }

  static getOpenedSessionIds() {
    return _fetch<string[]>(`/api/sessions/opened`);
  }

  static setOpenSession(sessionId: string) {
    return _fetch<Record<string, string>>(`/api/sessions/opened/${sessionId}`, {
      method: 'post',
    });
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

  static cloneSession(newSession: SqluiCore.CoreSession) {
    const clonedFromSessionId = newSession.id;
    const newName = newSession.name;

    return _fetch<SqluiCore.Session>(`/api/session/${clonedFromSessionId}/clone`, {
      method: 'post',
      body: JSON.stringify({
        name: newName,
      }),
    });
  }

  static deleteSession(sessionId: string) {
    return _fetch<string>(`/api/session/${sessionId}`, {
      method: 'delete',
    }).then(() => sessionId);
  }

  // used to read uploaded file content
  static readFileContent(file: File): Promise<string> {
    try {
      //@ts-ignore
      const fs = window.requireElectron('fs');
      return fs.readFileSync(file.path, { encoding: 'utf-8' });
    } catch (err) {
      const form = new FormData();
      form.append('file', file);
      return fetch('/api/file', {
        method: 'POST',
        body: form,
      }).then((r) => r.text());
    }
  }

  // folders api
  static getFolderItems(folderId: string) {
    return _fetch<SqluiCore.FolderItem[]>(`/api/folder/${folderId}`);
  }

  static addFolderItem(folderId: string, folderItem: Omit<SqluiCore.FolderItem, 'id'>) {
    return _fetch<SqluiCore.FolderItem>(`/api/folder/${folderId}`, {
      method: 'post',
      body: JSON.stringify(folderItem),
    });
  }

  static updateFolderItem(folderId: string, folderItem: SqluiCore.FolderItem) {
    return _fetch<SqluiCore.FolderItem>(`/api/folder/${folderId}`, {
      method: 'put',
      body: JSON.stringify(folderItem),
    });
  }

  static deleteFolderItem(folderId: SqluiCore.FolderType, itemId: string) {
    return _fetch<void>(`/api/folder/${folderId}/${itemId}`, {
      method: 'delete',
    });
  }

  // data api used for storing data for the window api
  static getDataSnapshots() {
    return _fetch<SqluiCore.DataSnapshot[]>(`/api/dataSnapshots`);
  }

  static getDataSnapshot(dataSnapshotId: string) {
    return _fetch<SqluiCore.DataSnapshot>(`/api/dataSnapshot/${dataSnapshotId}`);
  }

  static addDataSnapshot(
    dataSnapshot: Partial<SqluiCore.DataSnapshot> &
      Required<Pick<SqluiCore.DataSnapshot, 'values' | 'description'>>,
  ) {
    return _fetch<SqluiCore.DataSnapshot>(`/api/dataSnapshot`, {
      method: 'post',
      body: JSON.stringify(dataSnapshot),
    });
  }

  static deleteDataSnapshot(dataSnapshotId: string) {
    return _fetch<void>(`/api/dataSnapshot/${dataSnapshotId}`, {
      method: 'delete',
    });
  }
}

// selectively pick up which api to use...
export default ProxyApi;
