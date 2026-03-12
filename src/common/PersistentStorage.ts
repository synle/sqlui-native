import { app } from "electron";
import fs from "fs";
import path from "path";
import { getGeneratedRandomId } from "src/common/utils/commonUtils";
import { SqluiCore } from "typings";

const homedir = require("os").homedir();

// this section of the api is caches in memory
type StorageContent = {
  [index: string]: any;
};

type StorageEntry = {
  id: string;
  [index: string]: any;
};

let baseDir: string;
try {
  // electron path
  baseDir = path.join(app.getPath("appData"), "sqlui-native");
} catch (_err) {
  // fall back for mocked server
  baseDir = path.join(homedir, ".sqlui-native");
}
fs.mkdirSync(baseDir, { recursive: true });

/** Absolute path to the directory where all persistent storage JSON files are saved. */
export const storageDir = baseDir;

/**
 * Generic JSON file-based persistent storage for CRUD operations on typed entries.
 * Each instance maps to a single JSON file on disk in the app data directory.
 * @template T - The entry type, must have an `id` string property.
 */
export class PersistentStorage<T extends StorageEntry> {
  instanceId: string;
  name: string;
  storageLocation: string;

  /**
   * Creates a new PersistentStorage instance.
   * @param instanceId - Identifier for the storage instance (e.g., session ID).
   * @param name - Name of the data type being stored (e.g., "connection", "query").
   * @param storageLocation - Optional custom filename; defaults to `{instanceId}.{name}`.
   */
  constructor(instanceId: string, name: string, storageLocation?: string) {
    this.instanceId = instanceId;
    this.name = name;
    if (storageLocation) {
      this.storageLocation = path.join(baseDir, `${storageLocation}.json`);
    } else {
      this.storageLocation = path.join(baseDir, `${this.instanceId}.${this.name}.json`);
    }
  }

  private getData(): StorageContent {
    try {
      if (!fs.existsSync(this.storageLocation)) {
        this.setData({});
        return {};
      }
      return JSON.parse(fs.readFileSync(this.storageLocation, { encoding: "utf8", flag: "r" }).trim());
    } catch (err) {
      console.error("PersistentStorage.ts:parse", err);
      return {};
    }
  }

  private setData(toSave: StorageContent) {
    fs.writeFileSync(this.storageLocation, JSON.stringify(toSave, null, 2));
  }

  /**
   * Generates a random unique ID prefixed with this storage's name.
   * @returns A unique string ID.
   */
  getGeneratedRandomId() {
    return getGeneratedRandomId(`${this.name}`);
  }

  /**
   * Adds a new entry to storage, auto-generating an ID if not provided.
   * @param entry - The entry data to add.
   * @returns The saved entry with its assigned ID.
   */
  add<K>(entry: K): T {
    //@ts-ignore
    const newId = entry.id || this.getGeneratedRandomId();

    const caches = this.getData();
    caches[newId] = {
      id: newId,
      ...entry,
    };

    this.setData(caches);

    return caches[newId];
  }

  /**
   * Updates an existing entry by merging new values with the stored entry.
   * @param entry - The entry with updated fields; must include `id`.
   * @returns The merged and saved entry.
   */
  update(entry: T): T {
    const caches = this.getData();
    caches[entry.id] = {
      ...caches[entry.id],
      ...entry,
    };

    this.setData(caches);

    return caches[entry.id];
  }

  /**
   * Replaces all entries in storage with the provided array.
   * @param entries - The complete list of entries to store.
   * @returns The stored entries.
   */
  set(entries: T[]): T[] {
    const caches: StorageContent = {};

    for (const entry of entries) {
      caches[entry.id] = entry;
    }

    this.setData(caches);

    return entries;
  }

  /**
   * Returns all entries in storage as an array.
   * @returns Array of all stored entries.
   */
  list(): T[] {
    const caches = this.getData();
    return Object.values(caches);
  }

  /**
   * Retrieves a single entry by its ID.
   * @param id - The entry ID to look up.
   * @returns The matching entry, or undefined if not found.
   */
  get(id: string): T {
    const caches = this.getData();
    return caches[id];
  }

  /**
   * Deletes an entry by its ID.
   * @param id - The entry ID to remove.
   */
  delete(id: string) {
    const caches = this.getData();
    delete caches[id];
    this.setData(caches);
  }

  /**
   * Writes arbitrary data to a JSON file in the storage directory.
   * @param fileName - The file name (without directory path).
   * @param content - The data to serialize and write.
   * @returns The full path to the written file.
   */
  writeDataFile(fileName: string, content: any): string {
    const fullPath = path.join(baseDir, fileName);
    fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
    return fullPath;
  }

  /**
   * Reads and parses a JSON data file from disk.
   * @param filePath - The absolute path to the file.
   * @returns The parsed JSON content.
   */
  readDataFile(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, { encoding: "utf8", flag: "r" }).trim());
  }
}

export default PersistentStorage;

/**
 * Returns a PersistentStorage instance for database connections scoped to a session.
 * @param sessionId - The session ID to scope the storage to.
 * @returns A PersistentStorage instance for ConnectionProps entries.
 */
export async function getConnectionsStorage(sessionId: string) {
  if (!sessionId) {
    throw new Error(`sessionId is required for getConnectionsStorage`);
  }
  return await new PersistentStorage<SqluiCore.ConnectionProps>(sessionId, "connection");
}

/**
 * Returns a PersistentStorage instance for saved queries scoped to a session.
 * @param sessionId - The session ID to scope the storage to.
 * @returns A PersistentStorage instance for ConnectionQuery entries.
 */
export async function getQueryStorage(sessionId: string) {
  if (!sessionId) {
    throw new Error(`sessionId is required for getQueryStorage`);
  }
  return await new PersistentStorage<SqluiCore.ConnectionQuery>(sessionId, "query");
}

/**
 * Returns a PersistentStorage instance for session metadata.
 * @returns A PersistentStorage instance for Session entries.
 */
export async function getSessionsStorage() {
  return await new PersistentStorage<SqluiCore.Session>("session", "session", "sessions");
}

/**
 * Returns a PersistentStorage instance for folder items (bookmarks, recycle bin, etc.).
 * @param folderId - The folder identifier (e.g., "bookmarks", "recycleBin").
 * @returns A PersistentStorage instance for FolderItem entries.
 */
export async function getFolderItemsStorage(folderId: "bookmarks" | "recycleBin" | string) {
  if (!folderId) {
    throw new Error(`folderId is required for getFolderItemsStorage`);
  }
  return await new PersistentStorage<SqluiCore.FolderItem>("folders", folderId);
}

/**
 * Returns a PersistentStorage instance for data snapshots.
 * @returns A PersistentStorage instance for DataSnapshot entries.
 */
export async function getDataSnapshotStorage() {
  return await new PersistentStorage<SqluiCore.DataSnapshot>("dataSnapshots", "dataSnapshots", "dataSnapshots");
}

/**
 * Returns a PersistentStorage instance for application settings.
 * @returns A PersistentStorage instance for SettingsEntry entries.
 */
export async function getSettingsStorage() {
  return await new PersistentStorage<SqluiCore.SettingsEntry>("settings", "settings", "settings");
}
