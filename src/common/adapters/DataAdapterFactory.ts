import AzureCosmosDataAdapter from "src/common/adapters/AzureCosmosDataAdapter/index";
import AzureCosmosDataAdapterScripts from "src/common/adapters/AzureCosmosDataAdapter/scripts";
import AzureTableStorageAdapter from "src/common/adapters/AzureTableStorageAdapter/index";
import AzureTableStorageAdapterScripts from "src/common/adapters/AzureTableStorageAdapter/scripts";
import CassandraDataAdapter from "src/common/adapters/CassandraDataAdapter/index";
import CassandraDataAdapterScripts from "src/common/adapters/CassandraDataAdapter/scripts";
import { getDialectType, isDialectSupportManagedMetadata } from "src/common/adapters/DataScriptFactory";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import MongoDBDataAdapter from "src/common/adapters/MongoDBDataAdapter/index";
import MongoDBDataAdapterScripts from "src/common/adapters/MongoDBDataAdapter/scripts";
import RedisDataAdapter from "src/common/adapters/RedisDataAdapter/index";
import RedisDataAdapterScripts from "src/common/adapters/RedisDataAdapter/scripts";
import createRelationalDataAdapter from "src/common/adapters/RelationalDataAdapter/index";
import RelationalDataAdapterScripts from "src/common/adapters/RelationalDataAdapter/scripts";
import RestApiDataAdapter from "src/common/adapters/RestApiDataAdapter/index";
import RestApiDataAdapterScripts from "src/common/adapters/RestApiDataAdapter/scripts";
import SalesforceDataAdapter from "src/common/adapters/SalesforceDataAdapter/index";
import SalesforceDataAdapterScripts from "src/common/adapters/SalesforceDataAdapter/scripts";
import PersistentStorage, { getManagedDatabasesStorage, getManagedTablesStorage } from "src/common/PersistentStorage";
import { safeDisconnect } from "src/common/utils/errorUtils";
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

/** Maximum time (ms) a pending refresh is allowed before being force-evicted from the set. */
const PENDING_REFRESH_TIMEOUT_MS = 60 * 1000;

/**
 * Adds a key to pendingRefreshes with automatic eviction after PENDING_REFRESH_TIMEOUT_MS.
 * Prevents hung connections from permanently blocking future refreshes.
 * @param key - The cache key to track.
 */
function addPendingRefresh(key: string) {
  pendingRefreshes.add(key);
  setTimeout(() => {
    if (pendingRefreshes.has(key)) {
      console.error(`DataAdapterFactory.ts:addPendingRefresh - force-evicting stale refresh key: ${key}`);
      pendingRefreshes.delete(key);
    }
  }, PENDING_REFRESH_TIMEOUT_MS);
}

/** Minimum age (ms) a cache entry must reach before a background refresh is triggered. */
const CACHE_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Returns true if a cache entry's timestamp is old enough to warrant a background refresh.
 * @param timestamp - The epoch ms when the cache entry was last written.
 * @returns Whether the entry is stale enough to refresh.
 */
function isCacheStale(timestamp: number | undefined): boolean {
  if (!timestamp) return true;
  return Date.now() - timestamp >= CACHE_REFRESH_THRESHOLD_MS;
}

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
function getCachedDatabases(connectionId: string): { data: SqluiCore.DatabaseMetaData[]; timestamp: number } | undefined {
  try {
    const key = getDatabaseCacheKey(connectionId);
    const entry = databaseCacheStorage.get(key);
    if (entry?.data) {
      return { data: entry.data, timestamp: entry.timestamp };
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
function getCachedTables(connectionId: string, databaseId: string): { data: SqluiCore.TableMetaData[]; timestamp: number } | undefined {
  try {
    const key = getTableCacheKey(connectionId, databaseId);
    const entry = tableCacheStorage.get(key);
    if (entry?.data) {
      return { data: entry.data, timestamp: entry.timestamp };
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
function getCachedColumns(
  connectionId: string,
  databaseId: string,
  tableId: string,
): { data: SqluiCore.ColumnMetaData[]; timestamp: number } | undefined {
  try {
    const key = getColumnCacheKey(connectionId, databaseId, tableId);
    const entry = columnCacheStorage.get(key);
    if (entry?.data) {
      return { data: entry.data, timestamp: entry.timestamp };
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
 * Consolidated cache response containing databases, tables, and columns for a connection+database.
 */
export type CachedSchemaResult = {
  databases: SqluiCore.DatabaseMetaData[];
  tables: SqluiCore.TableMetaData[];
  columns: Record<string, SqluiCore.ColumnMetaData[]>;
};

/**
 * Returns all cached schema data (databases, tables, columns) for a connection+database
 * in a single call. Reads only from disk cache — no network queries are made.
 * @param connectionId - The connection identifier.
 * @param databaseId - The database name.
 * @returns Consolidated cache data with databases, tables, and columns.
 */
export function getCachedSchema(connectionId: string, databaseId: string): CachedSchemaResult {
  return {
    databases: getCachedDatabases(connectionId)?.data || [],
    tables: getCachedTables(connectionId, databaseId)?.data || [],
    columns: listCachedColumnsByDatabase(connectionId, databaseId),
  };
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
      adapter = createRelationalDataAdapter(connection);
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
    } else if (RestApiDataAdapterScripts.isDialectSupported(targetDialect)) {
      adapter = new RestApiDataAdapter(connection);
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

    // Use cached databases if available; fetch fresh in background only if stale
    const cachedDatabasesEntry = connection.id ? getCachedDatabases(connection.id) : undefined;
    let databases: SqluiCore.DatabaseMetaData[];
    if (cachedDatabasesEntry) {
      databases = cachedDatabasesEntry.data;
      connItem.status = "online";
      // Background refresh databases only if stale (deduplicated)
      if (isCacheStale(cachedDatabasesEntry.timestamp)) {
        const dbRefreshKey = getDatabaseCacheKey(connection.id!);
        if (!pendingRefreshes.has(dbRefreshKey)) {
          addPendingRefresh(dbRefreshKey);
          const connId = connection.id!;
          engine
            .getDatabases()
            .then((dbs) => setCachedDatabases(connId, dbs))
            .catch((err) => console.error("DataAdapterFactory.ts:backgroundRefreshDatabases", err))
            .finally(() => pendingRefreshes.delete(dbRefreshKey));
        }
      }
    } else {
      databases = await engine.getDatabases();
      connItem.status = "online";
      if (connection.id) {
        setCachedDatabases(connection.id, databases);
      }
    }

    // Separate databases into cached and uncached for table metadata
    const uncachedDatabases: SqluiCore.DatabaseMetaData[] = [];
    for (const database of databases) {
      connItem.databases.push(database);

      // Use cached tables if available; fetch fresh in background only if stale
      const cachedTablesEntry = connection.id ? getCachedTables(connection.id, database.name) : undefined;
      if (cachedTablesEntry) {
        database.tables = cachedTablesEntry.data;
        // Background refresh tables only if stale (deduplicated)
        if (isCacheStale(cachedTablesEntry.timestamp)) {
          const tableRefreshKey = getTableCacheKey(connection.id!, database.name);
          if (!pendingRefreshes.has(tableRefreshKey)) {
            addPendingRefresh(tableRefreshKey);
            const dbName = database.name;
            const connId = connection.id!;
            engine
              .getTables(dbName)
              .then((tables) => setCachedTables(connId, dbName, tables))
              .catch((err) => console.error("DataAdapterFactory.ts:backgroundRefreshTables", err))
              .finally(() => pendingRefreshes.delete(tableRefreshKey));
          }
        }
      } else {
        uncachedDatabases.push(database);
      }
    }

    // Fetch tables for uncached databases in parallel instead of sequentially
    if (uncachedDatabases.length > 0) {
      const tableResults = await Promise.allSettled(uncachedDatabases.map((db) => engine.getTables(db.name)));
      for (let i = 0; i < uncachedDatabases.length; i++) {
        const result = tableResults[i];
        const database = uncachedDatabases[i];
        if (result.status === "fulfilled") {
          database.tables = result.value;
          if (connection.id) {
            setCachedTables(connection.id, database.name, database.tables);
          }
        } else {
          console.error("DataAdapterFactory.ts:getTables", result.reason);
          database.tables = [];
        }
      }
    }

    // Use cached columns if available; skip API calls for tables without cached data.
    // Columns are fetched lazily via /api/columns when the user expands a table in the tree.
    for (const database of databases) {
      for (const table of database.tables) {
        const cached = connection.id ? getCachedColumns(connection.id, database.name, table.name) : undefined;
        table.columns = cached?.data || [];
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
  const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(sessionId, "connection").get(connectionId);

  if (!connection) {
    throw new Error(`Connection not found: ${connectionId}`);
  }

  // For managed-metadata adapters, always read directly from managed storage (no caching)
  const dialect = connection.dialect || getDialectType(connection.connection);
  if (isDialectSupportManagedMetadata(dialect)) {
    try {
      const dbStorage = await getManagedDatabasesStorage(connectionId);
      let managed = await dbStorage.list();
      // Auto-seed a folder if storage is empty (e.g., REST API connection created before this feature)
      if (managed.length === 0 && dialect === "rest") {
        await dbStorage.add({ id: "Folder 1", name: "Folder 1", connectionId });
        managed = await dbStorage.list();
      }
      return managed
        .map((entry): SqluiCore.DatabaseMetaData => ({ name: entry.name, tables: [] }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } catch (err) {
      console.error("DataAdapterFactory.ts:getManagedDatabases", err);
      return [];
    }
  }

  const cached = getCachedDatabases(connectionId);

  // Background refresh: fetch fresh data and update the cache for next call
  const refreshCache = async () => {
    const engine = getDataAdapter(connection.connection);
    try {
      const databases = (await engine.getDatabases()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCachedDatabases(connectionId, databases);
      return databases;
    } catch (err) {
      console.error("DataAdapterFactory.ts:refreshDatabaseCache", err);
      return undefined;
    } finally {
      await safeDisconnect(engine);
    }
  };

  if (cached) {
    // Return cached data immediately; refresh in background only if stale (deduplicated)
    if (isCacheStale(cached.timestamp)) {
      const refreshKey = getDatabaseCacheKey(connectionId);
      if (!pendingRefreshes.has(refreshKey)) {
        addPendingRefresh(refreshKey);
        refreshCache().finally(() => pendingRefreshes.delete(refreshKey));
      }
    }
    return cached.data;
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
  const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(sessionId, "connection").get(connectionId);

  if (!connection) {
    throw new Error(`Connection not found: ${connectionId}`);
  }

  // For managed-metadata adapters, always read directly from managed storage (no caching)
  const dialect = connection.dialect || getDialectType(connection.connection);
  if (isDialectSupportManagedMetadata(dialect)) {
    try {
      const tableStorage = await getManagedTablesStorage(connectionId);
      const managed = await tableStorage.list();
      return managed
        .filter((entry) => entry.databaseId === databaseId)
        .map((entry): SqluiCore.TableMetaData => ({ id: entry.id, name: entry.name, columns: [] }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } catch (err) {
      console.error("DataAdapterFactory.ts:getManagedTables", err);
      return [];
    }
  }

  const cached = getCachedTables(connectionId, databaseId);

  // Background refresh: fetch fresh data and update the cache for next call
  const refreshCache = async () => {
    const engine = getDataAdapter(connection.connection);
    try {
      const tables = (await engine.getTables(databaseId)).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setCachedTables(connectionId, databaseId, tables);
      return tables;
    } catch (err) {
      console.error("DataAdapterFactory.ts:refreshTableCache", err);
      return undefined;
    } finally {
      await safeDisconnect(engine);
    }
  };

  if (cached) {
    // Return cached data immediately; refresh in background only if stale (deduplicated)
    if (isCacheStale(cached.timestamp)) {
      const refreshKey = getTableCacheKey(connectionId, databaseId);
      if (!pendingRefreshes.has(refreshKey)) {
        addPendingRefresh(refreshKey);
        refreshCache().finally(() => pendingRefreshes.delete(refreshKey));
      }
    }
    return cached.data;
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
      await safeDisconnect(engine);
    }
  };

  if (cached) {
    // Return cached data immediately; refresh in background only if stale (deduplicated)
    if (isCacheStale(cached.timestamp)) {
      const refreshKey = getColumnCacheKey(connectionId, databaseId, tableId);
      if (!pendingRefreshes.has(refreshKey)) {
        addPendingRefresh(refreshKey);
        refreshCache().finally(() => pendingRefreshes.delete(refreshKey));
      }
    }
    return cached.data;
  }

  // No cache — must wait for fresh data
  const columns = await refreshCache();
  return columns || [];
}
