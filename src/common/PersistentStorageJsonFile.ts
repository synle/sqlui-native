/**
 * JSON file-based persistent storage backend.
 * @deprecated Use PersistentStorageSqlite instead. This backend will be removed once all users have migrated to SQLite storage.
 */

import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { IPersistentStorage, StorageContent, StorageEntry } from "src/common/IPersistentStorage";
import { getGeneratedRandomId } from "src/common/utils/commonUtils";
import { SqluiCore } from "typings";

const homedir = require("os").homedir();

let baseDir: string;
try {
  // electron path
  baseDir = path.join(app.getPath("appData"), "sqlui-native");
} catch (_err) {
  // fall back for non-Electron environments (sqlui-server, dev mode)
  baseDir = path.join(homedir, ".sqlui-native");
}
fs.mkdirSync(baseDir, { recursive: true });

/** Absolute path to the directory where all persistent storage files are saved. */
export const storageDir = baseDir;

/** In-memory cache keyed by file path to avoid repeated disk reads. */
const memoryCache = new Map<string, StorageContent>();

/**
 * Generic JSON file-based persistent storage for CRUD operations on typed entries.
 * Each instance maps to a single JSON file on disk in the app data directory.
 * Uses an in-memory cache to avoid repeated disk reads and async writes to
 * avoid blocking the event loop on mutations.
 *
 * **Do not instantiate directly.** Use the factory functions (e.g., `getConnectionsStorage`,
 * `getSettingsStorage`, `getCachedDatabasesStorage`) instead. Direct instantiation bypasses
 * the centralized table name mapping and makes future migration harder.
 *
 * @deprecated Use PersistentStorageSqlite instead.
 * @template T - The entry type, must have an `id` string property.
 */
// TODO: Remove PersistentStorageJsonFile once all users have migrated to SQLite storage (version >= 1)
export class PersistentStorageJsonFile<T extends StorageEntry> implements IPersistentStorage<T> {
  table: string;
  instanceId: string;
  name: string;
  storageLocation: string;

  /**
   * Creates a new PersistentStorageJsonFile instance.
   * @param table - The logical table name (ignored by JSON backend, used by SQLite).
   * @param instanceId - Identifier for the storage instance (e.g., session ID).
   * @param name - Name of the data type being stored (e.g., "connection", "query").
   * @param storageLocation - Optional custom filename; defaults to `{instanceId}.{name}`.
   */
  constructor(table: string, instanceId: string, name: string, storageLocation?: string) {
    this.table = table;
    this.instanceId = instanceId;
    this.name = name;
    if (storageLocation) {
      this.storageLocation = path.join(baseDir, `${storageLocation}.json`);
    } else {
      this.storageLocation = path.join(baseDir, `${this.instanceId}.${this.name}.json`);
    }
  }

  /** @returns The parsed storage content from disk or memory cache. */
  private getData(): StorageContent {
    const cached = memoryCache.get(this.storageLocation);
    if (cached) return cached;

    try {
      if (!fs.existsSync(this.storageLocation)) {
        this.setData({});
        return {};
      }
      const data = JSON.parse(fs.readFileSync(this.storageLocation, { encoding: "utf8", flag: "r" }).trim());
      memoryCache.set(this.storageLocation, data);
      return data;
    } catch (err) {
      console.error("PersistentStorageJsonFile.ts:parse", err);
      return {};
    }
  }

  /**
   * Persists data to the in-memory cache and asynchronously to disk.
   * @param toSave - The full storage content to write.
   */
  private setData(toSave: StorageContent) {
    memoryCache.set(this.storageLocation, toSave);
    const json = JSON.stringify(toSave, null, 2);
    fs.promises.writeFile(this.storageLocation, json).catch((err) => {
      console.error("PersistentStorageJsonFile.ts:setData", err);
    });
  }

  /** {@inheritDoc IPersistentStorage.getGeneratedRandomId} */
  getGeneratedRandomId() {
    return getGeneratedRandomId(`${this.name}`);
  }

  /** {@inheritDoc IPersistentStorage.add} */
  add<K>(entry: K): T {
    //@ts-ignore
    const newId = entry.id || this.getGeneratedRandomId();
    const now = Date.now();

    const caches = this.getData();
    caches[newId] = {
      id: newId,
      ...entry,
      createdAt: now,
      updatedAt: now,
    };

    this.setData(caches);

    return caches[newId];
  }

  /** {@inheritDoc IPersistentStorage.update} */
  update(entry: T): T {
    const caches = this.getData();
    caches[entry.id] = {
      ...caches[entry.id],
      ...entry,
      updatedAt: Date.now(),
    };

    this.setData(caches);

    return caches[entry.id];
  }

  /** {@inheritDoc IPersistentStorage.set} */
  set(entries: T[]): T[] {
    const caches: StorageContent = {};

    for (const entry of entries) {
      caches[entry.id] = entry;
    }

    this.setData(caches);

    return entries;
  }

  /** {@inheritDoc IPersistentStorage.list} */
  list(): T[] {
    const caches = this.getData();
    return Object.values(caches);
  }

  /** {@inheritDoc IPersistentStorage.get} */
  get(id: string): T {
    const caches = this.getData();
    return caches[id];
  }

  /** {@inheritDoc IPersistentStorage.delete} */
  delete(id: string) {
    const caches = this.getData();
    delete caches[id];
    this.setData(caches);
  }

  /** {@inheritDoc IPersistentStorage.writeDataFile} */
  writeDataFile(fileName: string, content: any): string {
    const fullPath = path.join(baseDir, fileName);
    fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
    return fullPath;
  }

  /** {@inheritDoc IPersistentStorage.readDataFile} */
  readDataFile(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, { encoding: "utf8", flag: "r" }).trim());
  }
}

export default PersistentStorageJsonFile;

// =============================================================================
// Factory functions
// =============================================================================

/**
 * Returns a PersistentStorageJsonFile instance for database connections scoped to a session.
 * @param sessionId - The session ID to scope the storage to.
 * @returns A PersistentStorageJsonFile instance for ConnectionProps entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export async function getConnectionsStorage(sessionId: string) {
  if (!sessionId) {
    throw new Error(`sessionId is required for getConnectionsStorage`);
  }
  return await new PersistentStorageJsonFile<SqluiCore.ConnectionProps>("connection", sessionId, "connection");
}

/**
 * Returns a PersistentStorageJsonFile instance for saved queries scoped to a session.
 * @param sessionId - The session ID to scope the storage to.
 * @returns A PersistentStorageJsonFile instance for ConnectionQuery entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export async function getQueryStorage(sessionId: string) {
  if (!sessionId) {
    throw new Error(`sessionId is required for getQueryStorage`);
  }
  return await new PersistentStorageJsonFile<SqluiCore.ConnectionQuery>("query", sessionId, "query");
}

/**
 * Returns a PersistentStorageJsonFile instance for session metadata.
 * @returns A PersistentStorageJsonFile instance for Session entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export async function getSessionsStorage() {
  return await new PersistentStorageJsonFile<SqluiCore.Session>("session", "session", "session", "sessions");
}

/**
 * Returns a PersistentStorageJsonFile instance for folder items (bookmarks, recycle bin, etc.).
 * @param folderId - The folder identifier (e.g., "bookmarks", "recycleBin").
 * @returns A PersistentStorageJsonFile instance for FolderItem entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export async function getFolderItemsStorage(folderId: "bookmarks" | "recycleBin" | string) {
  if (!folderId) {
    throw new Error(`folderId is required for getFolderItemsStorage`);
  }
  return await new PersistentStorageJsonFile<SqluiCore.FolderItem>("folder_item", "folders", folderId);
}

/**
 * Returns a PersistentStorageJsonFile instance for data snapshots.
 * @returns A PersistentStorageJsonFile instance for DataSnapshot entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export async function getDataSnapshotStorage() {
  return await new PersistentStorageJsonFile<SqluiCore.DataSnapshot>("data_snapshot", "dataSnapshots", "dataSnapshots", "dataSnapshots");
}

/**
 * Returns a PersistentStorageJsonFile instance for application settings.
 * @returns A PersistentStorageJsonFile instance for SettingsEntry entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export async function getSettingsStorage() {
  return await new PersistentStorageJsonFile<SqluiCore.SettingsEntry>("setting", "settings", "settings", "settings");
}

/**
 * Returns a PersistentStorageJsonFile instance for managed databases (folders) of a connection.
 * @param connectionId - The parent connection ID.
 * @returns A PersistentStorageJsonFile instance for ManagedDatabase entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export async function getManagedDatabasesStorage(connectionId: string) {
  if (!connectionId) {
    throw new Error(`connectionId is required for getManagedDatabasesStorage`);
  }
  return await new PersistentStorageJsonFile<SqluiCore.ManagedDatabase>("managed_database", "managedDatabases", connectionId);
}

/**
 * Returns a PersistentStorageJsonFile instance for managed tables (requests) of a connection.
 * @param connectionId - The parent connection ID.
 * @returns A PersistentStorageJsonFile instance for ManagedTable entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export async function getManagedTablesStorage(connectionId: string) {
  if (!connectionId) {
    throw new Error(`connectionId is required for getManagedTablesStorage`);
  }
  return await new PersistentStorageJsonFile<SqluiCore.ManagedTable>("managed_table", "managedTables", connectionId);
}

/** Cache entry shape for storing database metadata on disk. */
type CachedDatabaseEntry = { id: string; data: SqluiCore.DatabaseMetaData[]; timestamp: number };

/** Cache entry shape for storing table metadata on disk. */
type CachedTableEntry = { id: string; data: SqluiCore.TableMetaData[]; timestamp: number };

/** Cache entry shape for storing column metadata on disk. */
type CachedColumnEntry = { id: string; data: SqluiCore.ColumnMetaData[]; timestamp: number };

/** Cache entry shape for storing code snippet templates on disk. */
type CachedCodeSnippetEntry = { id: string; [key: string]: any };

/**
 * Returns a PersistentStorageJsonFile instance for cached database metadata.
 * @returns A PersistentStorageJsonFile instance for CachedDatabaseEntry entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export function getCachedDatabasesStorage() {
  return new PersistentStorageJsonFile<CachedDatabaseEntry>("cached_database", "cache", "databases", "cache.databases");
}

/**
 * Returns a PersistentStorageJsonFile instance for cached table metadata.
 * @returns A PersistentStorageJsonFile instance for CachedTableEntry entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export function getCachedTablesStorage() {
  return new PersistentStorageJsonFile<CachedTableEntry>("cached_table", "cache", "tables", "cache.tables");
}

/**
 * Returns a PersistentStorageJsonFile instance for cached column metadata.
 * @returns A PersistentStorageJsonFile instance for CachedColumnEntry entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export function getCachedColumnsStorage() {
  return new PersistentStorageJsonFile<CachedColumnEntry>("cached_column", "cache", "columns", "cache.columns");
}

/**
 * Returns a PersistentStorageJsonFile instance for cached code snippet templates.
 * @returns A PersistentStorageJsonFile instance for CachedCodeSnippetEntry entries.
 */
// TODO: Switch default to PersistentStorageSqlite
export function getCachedCodeSnippetsStorage() {
  return new PersistentStorageJsonFile<CachedCodeSnippetEntry>("cached_code_snippet", "cache", "code-snippets", "cache.code-snippets");
}
