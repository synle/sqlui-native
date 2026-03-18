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
import PersistentStorage from "src/common/PersistentStorage";
import { SqluiCore } from "typings";

type ColumnCacheEntry = { id: string; data: SqluiCore.ColumnMetaData[]; timestamp: number };

const columnCacheStorage = new PersistentStorage<ColumnCacheEntry>("cache", "columns", "cache.columns");

function getColumnCacheKey(connectionId: string, databaseId: string, tableId: string) {
  return `${connectionId}:${databaseId}:${tableId}`;
}

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

function setCachedColumns(connectionId: string, databaseId: string, tableId: string, data: SqluiCore.ColumnMetaData[]) {
  try {
    const key = getColumnCacheKey(connectionId, databaseId, tableId);
    columnCacheStorage.add({ id: key, data, timestamp: Date.now() });
  } catch (_err) {
    // best-effort cache write
  }
}

/**
 * Clears all cached column data for a given connection.
 * @param connectionId - The connection ID whose cached columns should be removed.
 */
export function clearCachedColumns(connectionId: string) {
  try {
    const allEntries = columnCacheStorage.list();
    const prefix = `${connectionId}:`;
    for (const entry of allEntries) {
      if (entry.id.startsWith(prefix)) {
        columnCacheStorage.delete(entry.id);
      }
    }
  } catch (_err) {
    // best-effort cache clear
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
    const databases = await engine.getDatabases();

    connItem.status = "online";
    connItem.dialect = engine.dialect;

    for (const database of databases) {
      connItem.databases.push(database);

      try {
        database.tables = await engine.getTables(database.name);
      } catch (err) {
        console.error("DataAdapterFactory.ts:getTables", err);
        database.tables = [];
      }

      for (const table of database.tables) {
        try {
          table.columns = cleanAndSortColumns(await engine.getColumns(table.name, database.name));
          if (connection.id) {
            setCachedColumns(connection.id, database.name, table.name, table.columns);
          }
        } catch (err) {
          console.error("DataAdapterFactory.ts:getColumns", err);
          table.columns = [];
        }
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

  const engine = getDataAdapter(connection.connection);
  try {
    return (await engine.getDatabases()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } finally {
    try {
      await engine.disconnect();
    } catch (_err) {
      // best-effort cleanup
    }
  }
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

  const engine = getDataAdapter(connection.connection);
  try {
    return (await engine.getTables(databaseId)).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  } finally {
    try {
      await engine.disconnect();
    } catch (_err) {
      // best-effort cleanup
    }
  }
}

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
    // Return cached data immediately; refresh in background for next time
    refreshCache();
    return cached;
  }

  // No cache — must wait for fresh data
  const columns = await refreshCache();
  return columns || [];
}
