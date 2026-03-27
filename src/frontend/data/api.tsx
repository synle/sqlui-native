import { columnFetchThrottle } from "src/frontend/data/connectionThrottle";
import { getCurrentSessionId } from "src/frontend/data/session";
import { SqluiCore, SqluiFrontend } from "typings";
async function _fetch<T>(input: RequestInfo, initOptions?: RequestInit) {
  let { headers, ...restInput } = initOptions || {};

  headers = headers || {};
  headers = {
    "sqlui-native-session-id": getCurrentSessionId(),
    "Content-Type": "application/json",
    Accept: "application/json",
    ...headers,
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
        console.error("api.tsx:parse", err);
        responseToUse = response;
      }

      return r.ok ? responseToUse : Promise.reject(responseToUse);
    })
    .then((r) => {
      const res: T = r;
      return res;
    });
}

/**
 * API client for communicating with the backend via HTTP requests.
 * Used in both Electron IPC and mocked server modes.
 */
export class ProxyApi {
  /** Fetches server configuration settings. */
  static getConfigs() {
    return _fetch<SqluiCore.ServerConfigs>(`/api/configs`);
  }

  /**
   * Updates server configuration settings.
   * @param settings - The settings to apply.
   * @returns The updated server configs.
   */
  static updateConfigs(settings: SqluiFrontend.Settings) {
    return _fetch<SqluiCore.ServerConfigs>(`/api/configs`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  /** Fetches all connections for the current session. */
  static getConnections() {
    return _fetch<SqluiCore.ConnectionProps[]>(`/api/connections`);
  }

  /**
   * Fetches all connections for a specific session.
   * @param sessionId - The session ID to fetch connections for.
   */
  static getConnectionsBySessionId(sessionId: string) {
    return _fetch<SqluiCore.ConnectionProps[]>(`/api/connections`, {
      headers: { "sqlui-native-session-id": sessionId },
    });
  }

  /**
   * Creates or updates a connection within a specific session.
   * @param sessionId - The target session ID.
   * @param connection - The connection properties to upsert.
   */
  static upsertConnectionForSession(sessionId: string, connection: SqluiCore.CoreConnectionProps) {
    const { id } = connection;
    if (id) {
      return _fetch<SqluiCore.ConnectionProps>(`/api/connection/${id}`, {
        method: "put",
        headers: { "sqlui-native-session-id": sessionId },
        body: JSON.stringify(connection),
      });
    } else {
      return _fetch<SqluiCore.ConnectionProps>(`/api/connection`, {
        method: "post",
        headers: { "sqlui-native-session-id": sessionId },
        body: JSON.stringify(connection),
      });
    }
  }

  /**
   * Fetches a single connection by ID.
   * @param connectionId - The connection ID.
   */
  static getConnection(connectionId: string) {
    return _fetch<SqluiCore.ConnectionProps>(`/api/connection/${connectionId}`);
  }

  /**
   * Fetches databases for a given connection.
   * @param connectionId - The connection ID.
   */
  static getConnectionDatabases(connectionId: string) {
    return _fetch<SqluiCore.DatabaseMetaData[]>(`/api/connection/${connectionId}/databases`);
  }

  /**
   * Fetches tables for a given connection and database.
   * @param connectionId - The connection ID.
   * @param databaseId - The database ID.
   */
  static getConnectionTables(connectionId: string, databaseId: string) {
    return _fetch<SqluiCore.TableMetaData[]>(`/api/connection/${connectionId}/database/${databaseId}/tables`);
  }

  /**
   * Fetches columns for a given table.
   * @param connectionId - The connection ID.
   * @param databaseId - The database ID.
   * @param tableId - The table ID.
   */
  static async getConnectionColumns(connectionId: string, databaseId: string, tableId: string) {
    const release = await columnFetchThrottle.acquire(connectionId);
    try {
      return await _fetch<SqluiCore.ColumnMetaData[]>(`/api/connection/${connectionId}/database/${databaseId}/table/${tableId}/columns`);
    } finally {
      release();
    }
  }

  /**
   * Fetches all cached column data for a connection+database from the backend disk cache.
   * Returns only what's already cached — no new database queries are made.
   * @param connectionId - The connection ID.
   * @param databaseId - The database ID.
   * @returns A record mapping table names to their cached column metadata arrays.
   */
  static getCachedSchema(connectionId: string, databaseId: string) {
    return _fetch<{
      databases: SqluiCore.DatabaseMetaData[];
      tables: SqluiCore.TableMetaData[];
      columns: Record<string, SqluiCore.ColumnMetaData[]>;
    }>(`/api/connection/${connectionId}/database/${databaseId}/schema/cached`);
  }

  /**
   * Deletes a connection by ID.
   * @param connectionId - The connection ID to delete.
   * @returns The deleted connection ID.
   */
  static deleteConnection(connectionId: string) {
    return _fetch<string>(`/api/connection/${connectionId}`, {
      method: "delete",
    }).then(() => connectionId);
  }

  /**
   * Creates or updates a connection in the current session.
   * @param newConnection - The connection properties to upsert.
   */
  static upsertConnection(newConnection: SqluiCore.CoreConnectionProps) {
    const { id } = newConnection;
    if (id) {
      return _fetch<SqluiCore.ConnectionProps>(`/api/connection/${id}`, {
        method: "put",
        body: JSON.stringify(newConnection),
      });
    } else {
      return _fetch<SqluiCore.ConnectionProps>(`/api/connection`, {
        method: "post",
        body: JSON.stringify(newConnection),
      });
    }
  }

  /**
   * Executes a SQL/NoSQL query against a connection.
   * @param query - The query to execute, including connection, database, and SQL.
   * @returns The query execution result.
   */
  static execute(query?: SqluiFrontend.ConnectionQuery) {
    return _fetch<SqluiCore.Result>(`/api/connection/${query?.connectionId}/execute`, {
      method: "post",
      body: JSON.stringify({
        sql: query?.sql,
        database: query?.databaseId,
        table: query?.tableId,
      }),
    });
  }

  /**
   * Reconnects to a database connection.
   * @param connectionId - The connection ID to reconnect.
   */
  static reconnect(connectionId: string) {
    return _fetch<SqluiCore.ConnectionMetaData>(`/api/connection/${connectionId}/connect`, {
      method: "post",
    });
  }

  /**
   * Refreshes a connection by clearing backend cache and re-authenticating.
   * @param connectionId - The connection ID to refresh.
   */
  static refreshConnection(connectionId: string) {
    return _fetch<SqluiCore.ConnectionMetaData>(`/api/connection/${connectionId}/refresh`, {
      method: "post",
    });
  }

  /**
   * Refreshes a database by clearing its backend cache (tables and columns).
   * @param connectionId - The connection ID.
   * @param databaseId - The database name to refresh.
   */
  static refreshDatabase(connectionId: string, databaseId: string) {
    return _fetch(`/api/connection/${connectionId}/database/${databaseId}/refresh`, {
      method: "post",
    });
  }

  /**
   * Refreshes a table by clearing its backend column cache.
   * @param connectionId - The connection ID.
   * @param databaseId - The database name.
   * @param tableId - The table name to refresh.
   */
  static refreshTable(connectionId: string, databaseId: string, tableId: string) {
    return _fetch(`/api/connection/${connectionId}/database/${databaseId}/table/${tableId}/refresh`, {
      method: "post",
    });
  }

  /**
   * Tests a database connection without persisting it.
   * @param connection - The connection properties to test.
   * @param signal - Optional AbortSignal to cancel the request.
   */
  static test(connection: SqluiCore.CoreConnectionProps, signal?: AbortSignal) {
    return _fetch<SqluiCore.CoreConnectionMetaData>(`/api/connection/test`, {
      method: "post",
      body: JSON.stringify(connection),
      signal,
    });
  }

  /**
   * Bulk updates all connections.
   * @param connections - The full list of connections to persist.
   */
  static update(connections: SqluiCore.ConnectionProps[]) {
    return _fetch<SqluiCore.ConnectionProps[]>(`/api/connections`, {
      method: "post",
      body: JSON.stringify(connections),
    });
  }

  /** Fetches all saved queries for the current session. */
  static getQueries() {
    return _fetch<SqluiCore.ConnectionQuery[]>(`/api/queries`);
  }

  /**
   * Creates or updates a query.
   * @param newQuery - The query to upsert.
   */
  static upsertQuery(newQuery: SqluiCore.CoreConnectionQuery) {
    const { id } = newQuery;
    if (id) {
      return _fetch<SqluiCore.CoreConnectionQuery>(`/api/query/${newQuery.id}`, {
        method: "put",
        body: JSON.stringify(newQuery),
      });
    } else {
      return _fetch<SqluiCore.CoreConnectionQuery>(`/api/query`, {
        method: "post",
        body: JSON.stringify(newQuery),
      });
    }
  }

  /**
   * Deletes a query by ID.
   * @param queryId - The query ID to delete.
   * @returns The deleted query ID.
   */
  static deleteQuery(queryId: string) {
    return _fetch<string>(`/api/query/${queryId}`, {
      method: "delete",
    }).then(() => queryId);
  }

  /** Fetches the current session. */
  static getSession() {
    return _fetch<SqluiCore.Session>(`/api/session`);
  }

  /** Fetches all sessions. */
  static getSessions() {
    return _fetch<SqluiCore.Session[]>(`/api/sessions`);
  }

  /**
   * Creates or updates a session.
   * @param newSession - The session to upsert.
   */
  static upsertSession(newSession: SqluiCore.CoreSession) {
    const { id } = newSession;
    if (id) {
      return _fetch<SqluiCore.Session>(`/api/session/${newSession.id}`, {
        method: "put",
        body: JSON.stringify(newSession),
      });
    } else {
      return _fetch<SqluiCore.Session>(`/api/session`, {
        method: "post",
        body: JSON.stringify(newSession),
      });
    }
  }

  /**
   * Clones an existing session with a new name.
   * @param newSession - Session to clone; id is the source, name is the new name.
   */
  static cloneSession(newSession: SqluiCore.CoreSession) {
    const clonedFromSessionId = newSession.id;
    const newName = newSession.name;

    return _fetch<SqluiCore.Session>(`/api/session/${clonedFromSessionId}/clone`, {
      method: "post",
      body: JSON.stringify({
        name: newName,
      }),
    });
  }

  /**
   * Deletes a session by ID.
   * @param sessionId - The session ID to delete.
   * @returns The deleted session ID.
   */
  static deleteSession(sessionId: string) {
    return _fetch<string>(`/api/session/${sessionId}`, {
      method: "delete",
    }).then(() => sessionId);
  }

  /**
   * Reads the content of an uploaded file. Uses Electron fs in desktop mode, HTTP upload otherwise.
   * @param file - The File object to read.
   * @returns The file content as a string.
   */
  static readFileContent(file: File): Promise<string> {
    try {
      //@ts-ignore
      const fs = window.requireElectron("fs");
      return fs.readFileSync(file.path, { encoding: "utf-8" });
    } catch (err) {
      console.error("api.tsx:readFileSync", err);
      const form = new FormData();
      form.append("file", file);
      return fetch("/api/file", {
        method: "POST",
        body: form,
      }).then((r) => r.text());
    }
  }

  /**
   * Fetches all items in a folder (e.g., recycle bin, bookmarks).
   * @param folderId - The folder ID.
   */
  static getFolderItems(folderId: string) {
    return _fetch<SqluiCore.FolderItem[]>(`/api/folder/${folderId}`);
  }

  /**
   * Adds an item to a folder.
   * @param folderId - The folder ID.
   * @param folderItem - The item to add (without ID).
   */
  static addFolderItem(folderId: string, folderItem: SqluiCore.FolderItemInput) {
    return _fetch<SqluiCore.FolderItem>(`/api/folder/${folderId}`, {
      method: "post",
      body: JSON.stringify(folderItem),
    });
  }

  /**
   * Updates an existing folder item.
   * @param folderId - The folder ID.
   * @param folderItem - The updated folder item.
   */
  static updateFolderItem(folderId: string, folderItem: SqluiCore.FolderItem) {
    return _fetch<SqluiCore.FolderItem>(`/api/folder/${folderId}`, {
      method: "put",
      body: JSON.stringify(folderItem),
    });
  }

  /**
   * Upserts a folder item: updates if the item has an ID and already exists, otherwise adds.
   * Used by the import flow to preserve original bookmark IDs.
   * @param folderId - The folder ID.
   * @param folderItem - The folder item to upsert.
   */
  static upsertFolderItem(folderId: string, folderItem: SqluiCore.FolderItem) {
    if (folderItem.id) {
      return _fetch<SqluiCore.FolderItem>(`/api/folder/${folderId}`, {
        method: "put",
        body: JSON.stringify(folderItem),
      });
    }
    return _fetch<SqluiCore.FolderItem>(`/api/folder/${folderId}`, {
      method: "post",
      body: JSON.stringify(folderItem),
    });
  }

  /**
   * Deletes an item from a folder.
   * @param folderId - The folder type/ID.
   * @param itemId - The item ID to delete.
   */
  static deleteFolderItem(folderId: SqluiCore.FolderType, itemId: string) {
    return _fetch<void>(`/api/folder/${folderId}/${itemId}`, {
      method: "delete",
    });
  }

  /** Fetches all data snapshots. */
  static getDataSnapshots() {
    return _fetch<SqluiCore.DataSnapshot[]>(`/api/dataSnapshots`);
  }

  /**
   * Fetches a single data snapshot by ID.
   * @param dataSnapshotId - The data snapshot ID.
   */
  static getDataSnapshot(dataSnapshotId: string) {
    return _fetch<SqluiCore.DataSnapshot>(`/api/dataSnapshot/${dataSnapshotId}`);
  }

  /**
   * Creates a new data snapshot.
   * @param dataSnapshot - The snapshot data with required values and description.
   */
  static addDataSnapshot(dataSnapshot: Partial<SqluiCore.DataSnapshot> & Required<Pick<SqluiCore.DataSnapshot, "values" | "description">>) {
    return _fetch<SqluiCore.DataSnapshot>(`/api/dataSnapshot`, {
      method: "post",
      body: JSON.stringify(dataSnapshot),
    });
  }

  /**
   * Deletes a data snapshot by ID.
   * @param dataSnapshotId - The data snapshot ID to delete.
   */
  static deleteDataSnapshot(dataSnapshotId: string) {
    return _fetch<void>(`/api/dataSnapshot/${dataSnapshotId}`, {
      method: "delete",
    });
  }

  /**
   * Searches the cached schema metadata for columns/tables matching a query string.
   * @param query - The search term to match against table names, column names, and column types.
   * @returns Array of schema search results.
   */
  static searchSchema(query: string) {
    return _fetch<SqluiCore.SchemaSearchResult[]>(`/api/schema/search?q=${encodeURIComponent(query)}`);
  }

  /** Fetches all query version history entries as folder items. */
  static getQueryVersionHistory() {
    return _fetch<SqluiCore.FolderItem[]>(`/api/queryVersionHistory`);
  }

  /**
   * Adds a new query version history entry as a folder item.
   * @param entry - The entry data to add.
   */
  static addQueryVersionHistory(entry: { connectionId: string; sql: string; auditType: SqluiCore.QueryVersionAuditType; name?: string }) {
    return _fetch<SqluiCore.FolderItem>(`/api/queryVersionHistory`, {
      method: "post",
      body: JSON.stringify(entry),
    });
  }

  /**
   * Deletes a single query version history entry.
   * @param entryId - The entry ID to delete.
   */
  static deleteQueryVersionHistory(entryId: string) {
    return _fetch<void>(`/api/queryVersionHistory/${entryId}`, {
      method: "delete",
    });
  }

  /** Clears all query version history entries. */
  static clearQueryVersionHistory() {
    return _fetch<void>(`/api/queryVersionHistory`, {
      method: "delete",
    });
  }
}

// selectively pick up which api to use...
export default ProxyApi;
