/** SQLite-backed persistent storage — stores all data in a single database file. */

import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { IPersistentStorage, StorageEntry } from "src/common/IPersistentStorage";
import { getGeneratedRandomId } from "src/common/utils/commonUtils";
import { writeDebugLog } from "src/common/utils/debugLogger";
import { storageDir } from "src/common/PersistentStorageJsonFile";

/** Default SQLite database file name. */
export const DB_FILE_NAME = "sqlui-native-storage.db";

/**
 * SQLite-backed persistent storage for CRUD operations on typed entries.
 * All instances share a single SQLite database file with separate tables per data type.
 * The `id` column is the single source of truth — `data` JSON does not contain `id`.
 *
 * **Do not instantiate directly.** Use the factory functions (e.g., `getConnectionsStorage`,
 * `getSettingsStorage`, `getCachedDatabasesStorage`) instead. Direct instantiation bypasses
 * the centralized table name mapping and makes future migration harder.
 *
 * @template T - The entry type, must have an `id` string property.
 */
export class PersistentStorageSqlite<T extends StorageEntry> implements IPersistentStorage<T> {
  table: string;
  instanceId: string;
  name: string;
  storageLocation: string;

  /** Shared database connection singleton. */
  private static db: DatabaseType | null = null;

  /** Absolute path to the SQLite database file. */
  private static dbPath: string;

  /** Set of table names already ensured to exist (avoids repeated CREATE TABLE calls). */
  private static ensuredTables = new Set<string>();

  /**
   * Creates a new PersistentStorageSqlite instance.
   * @param table - The SQLite table name for this storage instance.
   * @param instanceId - Identifier for the storage instance (e.g., session ID).
   * @param name - Name of the data type being stored (e.g., "connection", "query").
   * @param storageLocation - Optional custom filename; defaults to `{instanceId}.{name}` (vestigial, for interface compat).
   */
  constructor(table: string, instanceId: string, name: string, storageLocation?: string) {
    this.table = table;
    this.instanceId = instanceId;
    this.name = name;
    if (storageLocation) {
      this.storageLocation = path.join(storageDir, `${storageLocation}.json`);
    } else {
      this.storageLocation = path.join(storageDir, `${this.instanceId}.${this.name}.json`);
    }

    PersistentStorageSqlite.ensureDb();
    this.ensureTable();
  }

  /** Opens the shared database connection if not already open. */
  private static ensureDb(): void {
    if (PersistentStorageSqlite.db) return;

    PersistentStorageSqlite.dbPath = path.join(storageDir, DB_FILE_NAME);
    fs.mkdirSync(storageDir, { recursive: true });
    writeDebugLog(`PersistentStorageSqlite:ensureDb - opening ${PersistentStorageSqlite.dbPath}`);
    PersistentStorageSqlite.db = new Database(PersistentStorageSqlite.dbPath);
    PersistentStorageSqlite.db.pragma("journal_mode = WAL");
  }

  /** Creates the table for this instance if it doesn't already exist. */
  private ensureTable(): void {
    if (PersistentStorageSqlite.ensuredTables.has(this.table)) return;

    const db = PersistentStorageSqlite.getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS "${this.table}" (
      id   TEXT PRIMARY KEY NOT NULL,
      data JSON NOT NULL
    ) WITHOUT ROWID`);
    PersistentStorageSqlite.ensuredTables.add(this.table);
  }

  /** Returns the shared database connection, throwing if not initialized. */
  private static getDb(): DatabaseType {
    if (!PersistentStorageSqlite.db) {
      throw new Error("PersistentStorageSqlite: database not initialized");
    }
    return PersistentStorageSqlite.db;
  }

  /** {@inheritDoc IPersistentStorage.getGeneratedRandomId} */
  getGeneratedRandomId() {
    return getGeneratedRandomId(`${this.name}`);
  }

  /** {@inheritDoc IPersistentStorage.add} */
  add<K>(entry: K): T {
    const db = PersistentStorageSqlite.getDb();
    //@ts-ignore
    const newId = entry.id || this.getGeneratedRandomId();
    const now = Date.now();

    const obj: any = {
      ...entry,
      createdAt: now,
      updatedAt: now,
    };
    // Strip id from data — it lives only in the id column
    delete obj.id;

    db.prepare(`INSERT OR REPLACE INTO "${this.table}" (id, data) VALUES (?, ?)`).run(newId, JSON.stringify(obj));

    return { id: newId, ...obj } as T;
  }

  /** {@inheritDoc IPersistentStorage.update} */
  update(entry: T): T {
    const db = PersistentStorageSqlite.getDb();
    const existing = this.get(entry.id) || {};

    const merged: any = {
      ...existing,
      ...entry,
      updatedAt: Date.now(),
    };
    // Strip id from data
    const { id, ...data } = merged;

    db.prepare(`INSERT OR REPLACE INTO "${this.table}" (id, data) VALUES (?, ?)`).run(entry.id, JSON.stringify(data));

    return { id: entry.id, ...data } as T;
  }

  /** {@inheritDoc IPersistentStorage.set} */
  set(entries: T[]): T[] {
    const db = PersistentStorageSqlite.getDb();

    const tx = db.transaction(() => {
      db.prepare(`DELETE FROM "${this.table}"`).run();
      const insert = db.prepare(`INSERT INTO "${this.table}" (id, data) VALUES (?, ?)`);
      for (const entry of entries) {
        const { id, ...data } = entry as any;
        insert.run(id, JSON.stringify(data));
      }
    });
    tx();

    return entries;
  }

  /** {@inheritDoc IPersistentStorage.list} */
  list(): T[] {
    const db = PersistentStorageSqlite.getDb();
    const rows = db.prepare(`SELECT id, data FROM "${this.table}"`).all() as { id: string; data: string }[];
    return rows.map((row) => ({ id: row.id, ...JSON.parse(row.data) }) as T);
  }

  /** {@inheritDoc IPersistentStorage.get} */
  get(id: string): T {
    const db = PersistentStorageSqlite.getDb();
    const row = db.prepare(`SELECT id, data FROM "${this.table}" WHERE id = ?`).get(id) as { id: string; data: string } | undefined;
    if (!row) return undefined as any;
    return { id: row.id, ...JSON.parse(row.data) } as T;
  }

  /** {@inheritDoc IPersistentStorage.delete} */
  delete(id: string): void {
    const db = PersistentStorageSqlite.getDb();
    db.prepare(`DELETE FROM "${this.table}" WHERE id = ?`).run(id);
  }

  /** {@inheritDoc IPersistentStorage.writeDataFile} */
  writeDataFile(fileName: string, content: any): string {
    const fullPath = path.join(storageDir, fileName);
    fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
    return fullPath;
  }

  /** {@inheritDoc IPersistentStorage.readDataFile} */
  readDataFile(filePath: string): any {
    return JSON.parse(fs.readFileSync(filePath, { encoding: "utf8", flag: "r" }).trim());
  }

  /**
   * Closes the shared database connection. Primarily for testing cleanup.
   * @remarks Resets the singleton so the next constructor call will re-open.
   */
  static closeDb(): void {
    if (PersistentStorageSqlite.db) {
      PersistentStorageSqlite.db.close();
      PersistentStorageSqlite.db = null;
      PersistentStorageSqlite.ensuredTables.clear();
    }
  }

  /**
   * Overrides the database connection with the provided instance. Used for testing with `:memory:` databases.
   * @param db - The database instance to use.
   */
  static setDb(db: DatabaseType): void {
    PersistentStorageSqlite.db = db;
    PersistentStorageSqlite.ensuredTables.clear();
  }
}

export default PersistentStorageSqlite;
