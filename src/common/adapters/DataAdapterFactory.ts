import AzureCosmosDataAdapter from "src/common/adapters/AzureCosmosDataAdapter/index";
import AzureCosmosDataAdapterScripts from "src/common/adapters/AzureCosmosDataAdapter/scripts";
import AzureTableStorageAdapter from "src/common/adapters/AzureTableStorageAdapter/index";
import AzureTableStorageAdapterScripts from "src/common/adapters/AzureTableStorageAdapter/scripts";
import CassandraDataAdapter from "src/common/adapters/CassandraDataAdapter/index";
import CassandraDataAdapterScripts from "src/common/adapters/CassandraDataAdapter/scripts";
import { getDialectType } from "src/common/adapters/DataScriptFactory";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import MongoDBDataAdapter from "src/common/adapters/MongoDBDataAdapter/index";
import MongoDBDataAdapterScripts from "src/common/adapters/MongoDBDataAdapter/scripts";
import RedisDataAdapter from "src/common/adapters/RedisDataAdapter/index";
import RedisDataAdapterScripts from "src/common/adapters/RedisDataAdapter/scripts";
import RelationalDataAdapter from "src/common/adapters/RelationalDataAdapter/index";
import RelationalDataAdapterScripts from "src/common/adapters/RelationalDataAdapter/scripts";
import SalesforceDataAdapter from "src/common/adapters/SalesforceDataAdapter/index";
import SalesforceDataAdapterScripts from "src/common/adapters/SalesforceDataAdapter/scripts";
import PersistentStorage from "src/common/PersistentStorage";
import { SqluiCore } from "typings";

/** Cache entry shape for storing database metadata on disk. */
type DatabaseCacheEntry = { id: string; data: SqluiCore.DatabaseMetaData[]; timestamp: number };

/** Cache entry shape for storing table metadata on disk. */
type TableCacheEntry = { id: string; data: SqluiCore.TableMetaData[]; timestamp: number };

/** Cache entry shape for storing column metadata on disk. */
type ColumnCacheEntry = { id: string; data: SqluiCore.ColumnMetaData[]; timestamp: number };

const databaseCacheStorage = new PersistentStorage<DatabaseCacheEntry>("cache", "databases", "cache.databases");
const tableCacheStorage = new PersistentStorage<TableCacheEntry>("cache", "tables", "cache.tables");
const columnCacheStorage = new PersistentStorage<ColumnCacheEntry>("cache", "columns", "cache.columns");

/** Tracks in-flight background refreshes to prevent duplicate concurrent fetches. */
const pendingRefreshes = new Set<string>();

/**
 * Builds a unique cache key for a connection's databases.
 * @param connectionId - The connection identifier.
 * @returns A prefixed cache key string.
 */
function getDatabaseCacheKey(connectionId: string) {
  return `databases:${connectionId}`;
}

/**
 * Retrieves cached database metadata for a given connection, if available.
 * @param connectionId - The connection identifier.
 * @returns The cached database metadata array, or undefined on a cache miss.
 */
function getCachedDatabases(connectionId: string): SqluiCore.DatabaseMetaData[] | undefined {
  try {
    const key = getDatabaseCacheKey(connectionId);
    const entry = databaseCacheStorage.get(key);
    if (entry?.data) {
      return entry.data;
    }
  } catch (_err) {
    // cache miss on read error
  }
  return undefined;
}

/**
 * Persists database metadata to the disk cache for a given connection.
 * @param connectionId - The connection identifier.
 * @param data - The database metadata array to cache.
 */
function setCachedDatabases(connectionId: string, data: SqluiCore.DatabaseMetaData[]) {
  try {
    const key = getDatabaseCacheKey(connectionId);
    databaseCacheStorage.add({ id: key, data, timestamp: Date.now() });
  } catch (_err) {
    // best-effort cache write
  }
}

/**
 * Builds a unique cache key for a connection/database combination.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 * @returns A colon-separated cache key string.
 */
function getTableCacheKey(connectionId: string, databaseId: string) {
  return `tables:${connectionId}:${databaseId}`;
}

/**
 * Builds a unique cache key for a connection/database/table combination.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 * @param tableId - The table name.
 * @returns A colon-separated cache key string.
 */
function getColumnCacheKey(connectionId: string, databaseId: string, tableId: string) {
  return `${connectionId}:${databaseId}:${tableId}`;
}

/**
 * Retrieves cached table metadata for a given connection/database, if available.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 * @returns The cached table metadata array, or undefined on a cache miss.
 */
function getCachedTables(connectionId: string, databaseId: string): SqluiCore.TableMetaData[] | undefined {
  try {
    const key = getTableCacheKey(connectionId, databaseId);
    const entry = tableCacheStorage.get(key);
    if (entry?.data) {
      return entry.data;
    }
  } catch (_err) {
    // cache miss on read error
  }
  return undefined;
}

/**
 * Persists table metadata to the disk cache for a given connection/database.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 * @param data - The table metadata array to cache.
 */
function setCachedTables(connectionId: string, databaseId: string, data: SqluiCore.TableMetaData[]) {
  try {
    const key = getTableCacheKey(connectionId, databaseId);
    tableCacheStorage.add({ id: key, data, timestamp: Date.now() });
  } catch (_err) {
    // best-effort cache write
  }
}

/**
 * Retrieves cached column metadata for a given connection/database/table, if available.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 * @param tableId - The table name.
 * @returns The cached column metadata array, or undefined on a cache miss.
 */
function getCachedColumns(connectionId: string, databaseId: string, tableId: string): SqluiCore.ColumnMetaData[] | undefined {
  try {
    const key = getColumnCacheKey(connectionId, databaseId, tableId);
    const entry = columnCacheStorage.get(key);
    if (entry?.data) {
      return entry.data;
    }
  } catch (_err) {
    // cache miss on read error
  }
  return undefined;
}

/**
 * Persists column metadata to the disk cache for a given connection/database/table.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 * @param tableId - The table name.
 * @param data - The column metadata array to cache.
 */
function setCachedColumns(connectionId: string, databaseId: string, tableId: string, data: SqluiCore.ColumnMetaData[]) {
  try {
    const key = getColumnCacheKey(connectionId, databaseId, tableId);
    columnCacheStorage.add({ id: key, data, timestamp: Date.now() });
  } catch (_err) {
    // best-effort cache write
  }
}

/**
 * Returns all cached column entries from disk storage.
 * Each entry has an ID in the format "connectionId:databaseId:tableId" and a data array of columns.
 * @returns All cached column entries.
 */
export function listAllCachedColumns() {
  try {
    return columnCacheStorage.list();
  } catch (_err) {
    return [];
  }
}

/**
 * Returns all cached column data for a given connection and database.
 * Reads from the disk cache without making any network calls.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 * @returns A record mapping table names to their cached column metadata arrays.
 */
export function listCachedColumnsByDatabase(connectionId: string, databaseId: string): Record<string, SqluiCore.ColumnMetaData[]> {
  const prefix = `${connectionId}:${databaseId}:`;
  const result: Record<string, SqluiCore.ColumnMetaData[]> = {};
  try {
    const allCached = columnCacheStorage.list();
    for (const entry of allCached) {
      if (entry.id.startsWith(prefix)) {
        const tableId = entry.id.slice(prefix.length);
        result[tableId] = entry.data;
      }
    }
  } catch (_err) {
    // cache read failure — return empty
  }
  return result;
}

/**
 * Clears all cached database, table, and column data for a given connection.
 * @param connectionId - The connection ID whose cached data should be removed.
 */
export function clearCachedColumns(connectionId: string) {
  try {
    const dbKey = getDatabaseCacheKey(connectionId);
    databaseCacheStorage.delete(dbKey);
  } catch (_err) {
    // best-effort database cache clear
  }

  try {
    const allTableEntries = tableCacheStorage.list();
    for (const entry of allTableEntries) {
      if (entry.id.includes(connectionId)) {
        tableCacheStorage.delete(entry.id);
      }
    }
  } catch (_err) {
    // best-effort table cache clear
  }

  try {
    const allEntries = columnCacheStorage.list();
    const prefix = `${connectionId}:`;
    for (const entry of allEntries) {
      if (entry.id.startsWith(prefix)) {
        columnCacheStorage.delete(entry.id);
      }
    }
  } catch (_err) {
    // best-effort column cache clear
  }
}

/**
 * Clears cached table and column data for a specific database within a connection.
 * @param connectionId - The connection ID.
 * @param databaseId - The database name whose cached tables and columns should be removed.
 */
export function clearCachedDatabase(connectionId: string, databaseId: string) {
  try {
    const tableKey = getTableCacheKey(connectionId, databaseId);
    tableCacheStorage.delete(tableKey);
  } catch (_err) {
    // best-effort table cache clear
  }

  try {
    const allEntries = columnCacheStorage.list();
    const prefix = `${connectionId}:${databaseId}:`;
    for (const entry of allEntries) {
      if (entry.id.startsWith(prefix)) {
        columnCacheStorage.delete(entry.id);
      }
    }
  } catch (_err) {
    // best-effort column cache clear
  }
}

/**
 * Clears cached column data for a specific table within a connection and database.
 * @param connectionId - The connection ID.
 * @param databaseId - The database name.
 * @param tableId - The table name whose cached columns should be removed.
 */
export function clearCachedTable(connectionId: string, databaseId: string, tableId: string) {
  try {
    const key = getColumnCacheKey(connectionId, databaseId, tableId);
    columnCacheStorage.delete(key);
  } catch (_err) {
    // best-effort column cache clear
  }
}

/**
 * Creates and returns the appropriate data adapter for the given connection string.
 * @param connection - The connection string URI (e.g., "mysql://user:pass@host:port").
 * @returns An IDataAdapter instance for the detected dialect.
 * @throws Error if the dialect is not supported or connection fails.
 */
export function getDataAdapter(connection: string) {
  // TODO: here we should initialize the connection based on type
  // of the connection string
  let adapter: IDataAdapter | undefined;

  try {
    const targetDialect = getDialectType(connection);

    if (RelationalDataAdapterScripts.isDialectSupported(targetDialect)) {
      adapter = new RelationalDataAdapter(connection);
    } else if (CassandraDataAdapterScripts.isDialectSupported(targetDialect)) {
      adapter = new CassandraDataAdapter(connection);
    } else if (MongoDBDataAdapterScripts.isDialectSupported(targetDialect)) {
      adapter = new MongoDBDataAdapter(connection);
    } else if (RedisDataAdapterScripts.isDialectSupported(targetDialect)) {
      adapter = new RedisDataAdapter(connection);
    } else if (AzureCosmosDataAdapterScripts.isDialectSupported(targetDialect)) {
      adapter = new AzureCosmosDataAdapter(connection);
    } else if (AzureTableStorageAdapterScripts.isDialectSupported(targetDialect)) {
      adapter = new AzureTableStorageAdapter(connection);
    } else if (SalesforceDataAdapterScripts.isDialectSupported(targetDialect)) {
      adapter = new SalesforceDataAdapter(connection);
    }
  } catch (err) {
    console.error("DataAdapterFactory.ts:getDataAdapter", connection, err);
    throw err;
  }

  if (!adapter) {
    throw new Error("dialect not supported");
  }

  return adapter;
}

/**
 * Fetches full metadata (databases, tables, columns) for a connection.
 * @param connection - The core connection properties including name, id, and connection string.
 * @returns Connection metadata with status ("online" or "offline") and nested database/table/column info.
 */
export async function getConnectionMetaData(connection: SqluiCore.CoreConnectionProps) {
  const connItem: SqluiCore.CoreConnectionMetaData = {
    name: connection.name,
    id: connection?.id,
    connection: connection.connection,
    databases: [] as SqluiCore.DatabaseMetaData[],
  };

  const engine = getDataAdapter(connection.connection);
  try {
    connItem.dialect = engine.dialect;

    // Use cached databases if available; fetch fresh in background
    const cachedDatabases = connection.id ? getCachedDatabases(connection.id) : undefined;
    let databases: SqluiCore.DatabaseMetaData[];
    if (cachedDatabases) {
      databases = cachedDatabases;
      connItem.status = "online";
      // Background refresh databases (deduplicated)
      const dbRefreshKey = getDatabaseCacheKey(connection.id!);
      if (!pendingRefreshes.has(dbRefreshKey)) {
        pendingRefreshes.add(dbRefreshKey);
        const connId = connection.id!;
        engine
          .getDatabases()
          .then((dbs) => setCachedDatabases(connId, dbs))
          .catch((err) => console.error("DataAdapterFactory.ts:backgroundRefreshDatabases", err))
          .finally(() => pendingRefreshes.delete(dbRefreshKey));
      }
    } else {
      databases = await engine.getDatabases();
      connItem.status = "online";
      if (connection.id) {
        setCachedDatabases(connection.id, databases);
      }
    }

    for (const database of databases) {
      connItem.databases.push(database);

      // Use cached tables if available; fetch fresh in background
      const cachedTables = connection.id ? getCachedTables(connection.id, database.name) : undefined;
      if (cachedTables) {
        database.tables = cachedTables;
        // Background refresh tables (deduplicated)
        const tableRefreshKey = getTableCacheKey(connection.id!, database.name);
        if (!pendingRefreshes.has(tableRefreshKey)) {
          pendingRefreshes.add(tableRefreshKey);
          const dbName = database.name;
          const connId = connection.id!;
          engine
            .getTables(dbName)
            .then((tables) => setCachedTables(connId, dbName, tables))
            .catch((err) => console.error("DataAdapterFactory.ts:backgroundRefreshTables", err))
            .finally(() => pendingRefreshes.delete(tableRefreshKey));
        }
      } else {
        try {
          database.tables = await engine.getTables(database.name);
          if (connection.id) {
            setCachedTables(connection.id, database.name, database.tables);
          }
        } catch (err) {
          console.error("DataAdapterFactory.ts:getTables", err);
          database.tables = [];
        }
      }

      // Use cached columns if available; skip API calls for tables without cached data.
      // Columns are fetched lazily via /api/columns when the user expands a table in the tree.
      for (const table of database.tables) {
        const cached = connection.id ? getCachedColumns(connection.id, database.name, table.name) : undefined;
        table.columns = cached || [];
      }
    }
  } catch (err) {
    connItem.status = "offline";
    connItem.dialect = undefined;
    console.error("DataAdapterFactory.ts:getConnectionItem", err);
  } finally {
    try {
      await engine.disconnect();
    } catch (_err) {
      // best-effort cleanup
    }
  }

  return connItem;
}

/**
 * Returns a reset (offline, empty) metadata object for a connection.
 * @param connection - The core connection properties.
 * @returns Connection metadata with "offline" status and empty databases.
 */
export function resetConnectionMetaData(connection: SqluiCore.CoreConnectionProps) {
  const connItem: SqluiCore.CoreConnectionMetaData = {
    name: connection.name,
    id: connection?.id,
    connection: connection.connection,
    databases: [] as SqluiCore.DatabaseMetaData[],
    status: "offline",
  };
  return connItem;
}

/**
 * Retrieves and returns a sorted list of databases for a stored connection.
 * @param sessionId - The session identifier for persistent storage lookup.
 * @param connectionId - The connection identifier.
 * @returns Sorted array of database metadata.
 */
export async function getDatabases(sessionId: string, connectionId: string) {
  const cached = getCachedDatabases(connectionId);

  // Background refresh: fetch fresh data and update the cache for next call
  const refreshCache = async () => {
    const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(sessionId, "connection").get(connectionId);
    const engine = getDataAdapter(connection.connection);
    try {
      const databases = (await engine.getDatabases()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCachedDatabases(connectionId, databases);
      return databases;
    } catch (err) {
      console.error("DataAdapterFactory.ts:refreshDatabaseCache", err);
      return undefined;
    } finally {
      try {
        await engine.disconnect();
      } catch (_err) {
        // best-effort cleanup
      }
    }
  };

  if (cached) {
    // Return cached data immediately; refresh in background for next time (deduplicated)
    const refreshKey = getDatabaseCacheKey(connectionId);
    if (!pendingRefreshes.has(refreshKey)) {
      pendingRefreshes.add(refreshKey);
      refreshCache().finally(() => pendingRefreshes.delete(refreshKey));
    }
    return cached;
  }

  // No cache — must wait for fresh data
  const databases = await refreshCache();
  return databases || [];
}

/**
 * Retrieves and returns a sorted list of tables for a given database.
 * @param sessionId - The session identifier for persistent storage lookup.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name to list tables from.
 * @returns Sorted array of table metadata.
 */
export async function getTables(sessionId: string, connectionId: string, databaseId: string) {
  const cached = getCachedTables(connectionId, databaseId);

  // Background refresh: fetch fresh data and update the cache for next call
  const refreshCache = async () => {
    const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(sessionId, "connection").get(connectionId);
    const engine = getDataAdapter(connection.connection);
    try {
      const tables = (await engine.getTables(databaseId)).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCachedTables(connectionId, databaseId, tables);
      return tables;
    } catch (err) {
      console.error("DataAdapterFactory.ts:refreshTableCache", err);
      return undefined;
    } finally {
      try {
        await engine.disconnect();
      } catch (_err) {
        // best-effort cleanup
      }
    }
  };

  if (cached) {
    // Return cached data immediately; refresh in background for next time (deduplicated)
    const refreshKey = getTableCacheKey(connectionId, databaseId);
    if (!pendingRefreshes.has(refreshKey)) {
      pendingRefreshes.add(refreshKey);
      refreshCache().finally(() => pendingRefreshes.delete(refreshKey));
    }
    return cached;
  }

  // No cache — must wait for fresh data
  const tables = await refreshCache();
  return tables || [];
}

/**
 * Strips falsy optional flags from column metadata and sorts columns by key importance then name.
 * Primary keys and partition keys sort first, then unique columns, then clustering keys, then alphabetically.
 * @param columns - The raw column metadata array to clean and sort.
 * @returns The cleaned and sorted column metadata array.
 */
function cleanAndSortColumns(columns: SqluiCore.ColumnMetaData[]): SqluiCore.ColumnMetaData[] {
  return columns
    .map((column) => {
      if (column.primaryKey !== true) {
        delete column.primaryKey;
      }

      if (column.unique !== true) {
        delete column.unique;
      }

      if (column.nested !== true) {
        delete column.nested;
      }

      if (!column?.propertyPath || column?.propertyPath.length <= 1) {
        delete column.propertyPath;
      }

      return column;
    })
    .sort((a, b) => {
      const aPrimaryKey = a.primaryKey || a.kind === "partition_key";
      const bPrimaryKey = b.primaryKey || b.kind === "partition_key";

      if (aPrimaryKey !== bPrimaryKey) {
        return aPrimaryKey ? -1 : 1;
      }

      if (a.unique !== b.unique) {
        return a.unique ? -1 : 1;
      }

      const aClusterKey = a.kind === "clustering";
      const bClusterKey = b.kind === "clustering";

      if (aClusterKey !== bClusterKey) {
        return aClusterKey ? -1 : 1;
      }

      return (a.name || "").localeCompare(b.name || "");
    });
}

/**
 * Retrieves columns for a table, cleans up metadata, and sorts by key importance then name.
 * Returns cached data immediately if available; fetches fresh data in the background to update the cache.
 * @param sessionId - The session identifier for persistent storage lookup.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 * @param tableId - The table name.
 * @returns Sorted array of column metadata with cleaned-up properties.
 */
export async function getColumns(sessionId: string, connectionId: string, databaseId: string, tableId: string) {
  const cached = getCachedColumns(connectionId, databaseId, tableId);

  // Background refresh: fetch fresh data and update the cache for next call
  const refreshCache = async () => {
    const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(sessionId, "connection").get(connectionId);
    const engine = getDataAdapter(connection.connection);
    try {
      const columns = cleanAndSortColumns(await engine.getColumns(tableId, databaseId));
      setCachedColumns(connectionId, databaseId, tableId, columns);
      return columns;
    } catch (err) {
      console.error("DataAdapterFactory.ts:refreshCache", err);
      return undefined;
    } finally {
      try {
        await engine.disconnect();
      } catch (_err) {
        // best-effort cleanup
      }
    }
  };

  if (cached) {
    // Return cached data immediately; refresh in background for next time (deduplicated)
    const refreshKey = getColumnCacheKey(connectionId, databaseId, tableId);
    if (!pendingRefreshes.has(refreshKey)) {
      pendingRefreshes.add(refreshKey);
      refreshCache().finally(() => pendingRefreshes.delete(refreshKey));
    }
    return cached;
  }

  // No cache — must wait for fresh data
  const columns = await refreshCache();
  return columns || [];
}
