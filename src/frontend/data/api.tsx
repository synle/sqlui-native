import { columnFetchThrottle } from "src/frontend/data/connectionThrottle";
import { getCurrentSessionId } from "src/frontend/data/session";
import { platform } from "src/frontend/platform";
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
 * Communicates with the sqlui-server via HTTP in all modes.
 */
export class ProxyApi {
  /** Fetches server configuration settings. */
  static getConfigs() {
    return _fetch<SqluiCore.ServerConfigs>(`/api/configs`);
  }

  /**
   * Downloads the SQLite database backup as a blob and triggers a browser download.
   * @returns A promise that resolves when the download is triggered.
   */
  static async backupDatabase() {
    const response = await fetch(`/api/backup/database`, {
      headers: { "sqlui-native-session-id": getCurrentSessionId() },
    });
    if (!response.ok) {
      throw new Error("Failed to download database backup");
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const contentDisposition = response.headers.get("Content-Disposition") || "";
    const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
    const fileName = fileNameMatch ? fileNameMatch[1] : `sqlui-native-backup-${Date.now()}.db`;
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  // =========================================================================
  // Managed metadata API (folders/requests for REST API, etc.)
  // =========================================================================

  /**
   * Lists all managed databases (folders) for a connection.
   * @param connectionId - The connection ID.
   */
  static listManagedDatabases(connectionId: string) {
    return _fetch<SqluiCore.ManagedDatabase[]>(`/api/connection/${connectionId}/managedDatabases`);
  }

  /**
   * Lists all managed tables (requests) for a connection.
   * @param connectionId - The connection ID.
   */
  static listManagedTables(connectionId: string) {
    return _fetch<SqluiCore.ManagedTable[]>(`/api/connection/${connectionId}/managedTables`);
  }

  /**
   * Fetches a single managed database (folder) by ID, including props.
   * @param connectionId - The connection ID.
   * @param managedDatabaseId - The database name/ID.
   */
  static getManagedDatabase(connectionId: string, managedDatabaseId: string) {
    return _fetch<SqluiCore.ManagedDatabase>(`/api/connection/${connectionId}/managedDatabase/${encodeURIComponent(managedDatabaseId)}`);
  }

  /**
   * Creates a managed database (folder) for a connection.
   * @param connectionId - The connection ID.
   * @param body - The database name.
   */
  static createManagedDatabase(connectionId: string, body: { name: string }) {
    return _fetch<SqluiCore.ManagedDatabase>(`/api/connection/${connectionId}/managedDatabase`, {
      method: "post",
      body: JSON.stringify(body),
    });
  }

  /**
   * Renames a managed database (folder).
   * @param connectionId - The connection ID.
   * @param managedDatabaseId - The current database name/ID.
   * @param body - The new name.
   */
  static renameManagedDatabase(connectionId: string, managedDatabaseId: string, body: { name: string }) {
    return _fetch<SqluiCore.ManagedDatabase>(`/api/connection/${connectionId}/managedDatabase/${encodeURIComponent(managedDatabaseId)}`, {
      method: "put",
      body: JSON.stringify(body),
    });
  }

  /**
   * Updates a managed database's props (e.g., variables for REST API folders).
   * @param connectionId - The connection ID.
   * @param managedDatabaseId - The database name/ID.
   * @param body - The properties to merge.
   */
  static updateManagedDatabase(connectionId: string, managedDatabaseId: string, body: { props: SqluiCore.ManagedProperties }) {
    return _fetch<SqluiCore.ManagedDatabase>(`/api/connection/${connectionId}/managedDatabase/${encodeURIComponent(managedDatabaseId)}`, {
      method: "put",
      body: JSON.stringify(body),
    });
  }

  /**
   * Deletes a managed database (folder) and its child tables.
   * @param connectionId - The connection ID.
   * @param managedDatabaseId - The database name/ID to delete.
   */
  static deleteManagedDatabase(connectionId: string, managedDatabaseId: string) {
    return _fetch(`/api/connection/${connectionId}/managedDatabase/${encodeURIComponent(managedDatabaseId)}`, {
      method: "delete",
    });
  }

  /**
   * Creates a managed table (request) within a database folder.
   * @param connectionId - The connection ID.
   * @param databaseId - The parent database/folder name.
   * @param body - The table name.
   */
  static createManagedTable(connectionId: string, databaseId: string, body: { name: string }) {
    return _fetch<SqluiCore.ManagedTable>(`/api/connection/${connectionId}/database/${encodeURIComponent(databaseId)}/managedTable`, {
      method: "post",
      body: JSON.stringify(body),
    });
  }

  /**
   * Deletes a managed table (request).
   * @param connectionId - The connection ID.
   * @param databaseId - The parent database/folder name.
   * @param managedTableId - The table name/ID to delete.
   */
  static deleteManagedTable(connectionId: string, databaseId: string, managedTableId: string) {
    return _fetch(
      `/api/connection/${connectionId}/database/${encodeURIComponent(databaseId)}/managedTable/${encodeURIComponent(managedTableId)}`,
      { method: "delete" },
    );
  }

  /**
   * Fetches a single managed table by ID (includes props).
   * @param connectionId - The connection ID.
   * @param databaseId - The parent database/folder name.
   * @param managedTableId - The table name/ID.
   */
  static getManagedTable(connectionId: string, databaseId: string, managedTableId: string) {
    return _fetch<SqluiCore.ManagedTable>(
      `/api/connection/${connectionId}/database/${encodeURIComponent(databaseId)}/managedTable/${encodeURIComponent(managedTableId)}`,
    );
  }

  /**
   * Updates a managed table's name and/or props (e.g., saved query for REST API requests).
   * @param connectionId - The connection ID.
   * @param databaseId - The parent database/folder name.
   * @param managedTableId - The table UUID.
   * @param body - The fields to update (name and/or props).
   */
  static updateManagedTable(
    connectionId: string,
    databaseId: string,
    managedTableId: string,
    body: { name?: string; props?: SqluiCore.ManagedProperties } | SqluiCore.ManagedProperties,
  ) {
    // Normalize: if body has 'name' or 'props' key at top level, send as-is; otherwise wrap as props
    const payload = "name" in body || "props" in body ? body : { props: body };
    return _fetch<SqluiCore.ManagedTable>(
      `/api/connection/${connectionId}/database/${encodeURIComponent(databaseId)}/managedTable/${encodeURIComponent(managedTableId)}`,
      {
        method: "put",
        body: JSON.stringify(payload),
      },
    );
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
    return platform.readFileContent(file);
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
