/**
 * Barrel re-export for persistent storage. Defaults to JSON file backend for backward compatibility.
 *
 * **Do not instantiate `PersistentStorage` / `PersistentStorageJsonFile` / `PersistentStorageSqlite` directly.**
 * Always use the factory functions (`getConnectionsStorage`, `getSettingsStorage`, etc.) which
 * centralize the table name mapping. Adding new storage types? Create a new factory function here.
 */

export type { IPersistentStorage, StorageContent, StorageEntry } from "src/common/IPersistentStorage";

export {
  PersistentStorageJsonFile,
  PersistentStorageJsonFile as PersistentStorage,
  storageDir,
  getConnectionsStorage,
  getQueryStorage,
  getSessionsStorage,
  getFolderItemsStorage,
  getDataSnapshotStorage,
  getSettingsStorage,
  getManagedDatabasesStorage,
  getManagedTablesStorage,
  getCachedDatabasesStorage,
  getCachedTablesStorage,
  getCachedColumnsStorage,
  getCachedCodeSnippetsStorage,
} from "src/common/PersistentStorageJsonFile";

export { PersistentStorageSqlite } from "src/common/PersistentStorageSqlite";
export {
  runMigration,
  getStorageVersion,
  getDbFilePath,
  dbFileExists,
  CURRENT_STORAGE_VERSION,
  STORAGE_VERSION_ID,
} from "src/common/PersistentStorageMigration";

export { default } from "src/common/PersistentStorageJsonFile";
