/** SQLite-backed persistent storage — stores all data in a single database file. */

import { DatabaseSync, type StatementSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { IPersistentStorage, StorageEntry } from "src/common/IPersistentStorage";
import { getGeneratedRandomId } from "src/common/utils/commonUtils";
import { writeDebugLog } from "src/common/utils/debugLogger";
import { getStorageDir } from "src/common/PersistentStorageJsonFile";

/**
 * Returns a shallow copy of the object with all undefined-valued keys removed.
 * Prevents `undefined` from overwriting existing values during spread merges.
 */
function stripUndefined<T>(obj: T): Partial<T> {
  const result: any = {};
  for (const [key, value] of Object.entries(obj as any)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

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

  /** Optional storage filename override (without ".json"); when null, falls back to `{instanceId}.{name}`. */
  private readonly storageBasename: string | undefined;

  /** Cached resolved absolute path; populated on first {@link storageLocation} access. */
  private _storageLocation?: string;

  /** Shared database connection singleton. */
  private static db: DatabaseSync | null = null;

  /** Absolute path to the SQLite database file. */
  private static dbPath: string;

  /** Set of table names already ensured to exist (avoids repeated CREATE TABLE calls). */
  private static ensuredTables = new Set<string>();

  /**
   * Prepared statements keyed by SQL text, scoped to the current {@link db} connection.
   *
   * Re-preparing the same SQL on every call forces SQLite to re-parse and re-plan the query. The
   * statement objects are reusable across `run`/`get`/`all` invocations, so caching them removes
   * that per-call cost from every read and write.
   *
   * @remarks Statements are bound to the connection that created them, so this **must** be cleared
   * whenever {@link db} is replaced ({@link closeDb}, {@link setDb}) — otherwise a cached statement
   * would reference a closed or stale database.
   */
  private static statementCache = new Map<string, StatementSync>();

  /** Nesting depth of the active {@link transaction}; 0 when no transaction is open. */
  private static transactionDepth = 0;

  /**
   * Creates a new PersistentStorageSqlite instance.
   *
   * **Critical: does NOT resolve {@link storageLocation} or open the DB here.**
   * Module-level factory consumers instantiate this at import time, before
   * `process.env.SQLUI_HOME_DIR` is set in portal mode. Both the file path and
   * the shared SQLite connection are deferred to first storage operation.
   *
   * @param table - The SQLite table name for this storage instance.
   * @param instanceId - Identifier for the storage instance (e.g., session ID).
   * @param name - Name of the data type being stored (e.g., "connection", "query").
   * @param storageLocation - Optional custom filename; defaults to `{instanceId}.{name}` (vestigial, for interface compat).
   */
  constructor(table: string, instanceId: string, name: string, storageLocation?: string) {
    this.table = table;
    this.instanceId = instanceId;
    this.name = name;
    this.storageBasename = storageLocation;
  }

  /** Lazily resolved storageLocation (kept for IPersistentStorage interface compat). */
  get storageLocation(): string {
    if (this._storageLocation === undefined) {
      const basename = this.storageBasename ? `${this.storageBasename}.json` : `${this.instanceId}.${this.name}.json`;
      this._storageLocation = path.join(getStorageDir(), basename);
    }
    return this._storageLocation;
  }

  /** Lazily ensures the shared DB connection + this instance's table on first storage call. */
  private ensure(): void {
    PersistentStorageSqlite.ensureDb();
    this.ensureTable();
  }

  /** Opens the shared database connection if not already open. */
  private static ensureDb(): void {
    if (PersistentStorageSqlite.db) return;

    const sd = getStorageDir();
    PersistentStorageSqlite.dbPath = path.join(sd, DB_FILE_NAME);
    fs.mkdirSync(sd, { recursive: true });
    writeDebugLog(`PersistentStorageSqlite:ensureDb - opening ${PersistentStorageSqlite.dbPath}`);
    PersistentStorageSqlite.db = new DatabaseSync(PersistentStorageSqlite.dbPath);
    PersistentStorageSqlite.db.exec("PRAGMA journal_mode = WAL");
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
  private static getDb(): DatabaseSync {
    if (!PersistentStorageSqlite.db) {
      throw new Error("PersistentStorageSqlite: database not initialized");
    }
    return PersistentStorageSqlite.db;
  }

  /**
   * Returns a prepared statement for `sql`, reusing a cached one when available.
   * @param sql - The SQL text; also serves as the cache key (table names are already interpolated).
   */
  private static prepare(sql: string): StatementSync {
    const cached = PersistentStorageSqlite.statementCache.get(sql);
    if (cached) return cached;

    const statement = PersistentStorageSqlite.getDb().prepare(sql);
    PersistentStorageSqlite.statementCache.set(sql, statement);
    return statement;
  }

  /**
   * Runs `fn` inside a single SQLite transaction, committing on success and rolling back on throw.
   *
   * Without this, every write is its own implicit transaction, which costs a disk sync per row.
   * Batching a bulk write into one transaction turns N syncs into one.
   *
   * Nested calls use a `SAVEPOINT` rather than a second `BEGIN` (SQLite rejects nested `BEGIN`), so an
   * inner failure unwinds only the inner work. That keeps a nested call's semantics identical to a
   * standalone one: if the caller catches the inner error and carries on, the inner writes are gone
   * but the outer transaction is still intact and commits normally.
   *
   * @param fn - The work to run transactionally.
   * @returns Whatever `fn` returns.
   */
  static transaction<T>(fn: () => T): T {
    PersistentStorageSqlite.ensureDb();
    const db = PersistentStorageSqlite.getDb();

    const depth = PersistentStorageSqlite.transactionDepth;
    const nested = depth > 0;
    const savepoint = `sqlui_sp_${depth}`;

    db.exec(nested ? `SAVEPOINT ${savepoint}` : "BEGIN");
    PersistentStorageSqlite.transactionDepth = depth + 1;

    try {
      const result = fn();
      db.exec(nested ? `RELEASE ${savepoint}` : "COMMIT");
      return result;
    } catch (err) {
      try {
        if (nested) {
          // ROLLBACK TO rewinds to the savepoint but leaves it on the stack; RELEASE pops it.
          db.exec(`ROLLBACK TO ${savepoint}`);
          db.exec(`RELEASE ${savepoint}`);
        } else {
          db.exec("ROLLBACK");
        }
      } catch (rollbackErr) {
        // Swallowed so the original failure is what propagates — a rollback error is a symptom.
        console.error("PersistentStorageSqlite.ts:transaction", rollbackErr);
      } finally {
        // DDL is transactional in SQLite, so unwinding can also undo the CREATE TABLE issued by
        // `ensureTable`. The memoized caches would then claim tables and statements that no longer
        // exist, and every later write would fail with "no such table". Drop both and let them rebuild.
        PersistentStorageSqlite.ensuredTables.clear();
        PersistentStorageSqlite.statementCache.clear();
      }
      throw err;
    } finally {
      PersistentStorageSqlite.transactionDepth = depth;
    }
  }

  /** {@inheritDoc IPersistentStorage.getGeneratedRandomId} */
  getGeneratedRandomId() {
    return getGeneratedRandomId(`${this.name}`);
  }

  /** {@inheritDoc IPersistentStorage.add} */
  add<K>(entry: K): T {
    this.ensure();
    //@ts-ignore
    const newId = entry.id || this.getGeneratedRandomId();
    const now = Date.now();

    const obj: any = {
      ...stripUndefined(entry),
      createdAt: now,
      updatedAt: now,
    };
    // Strip id from data — it lives only in the id column
    delete obj.id;

    PersistentStorageSqlite.prepare(`INSERT OR REPLACE INTO "${this.table}" (id, data) VALUES (?, ?)`).run(newId, JSON.stringify(obj));

    return { id: newId, ...obj } as T;
  }

  /** {@inheritDoc IPersistentStorage.update} */
  update(entry: T): T {
    this.ensure();
    const existing = this.get(entry.id) || {};

    const merged: any = {
      ...existing,
      ...stripUndefined(entry),
      updatedAt: Date.now(),
    };
    // Strip id from data
    const { id, ...data } = merged;

    PersistentStorageSqlite.prepare(`INSERT OR REPLACE INTO "${this.table}" (id, data) VALUES (?, ?)`).run(
      entry.id,
      JSON.stringify(data),
    );

    return { id: entry.id, ...data } as T;
  }

  /** {@inheritDoc IPersistentStorage.set} */
  set(entries: T[]): T[] {
    this.ensure();

    PersistentStorageSqlite.transaction(() => {
      PersistentStorageSqlite.prepare(`DELETE FROM "${this.table}"`).run();
      const insert = PersistentStorageSqlite.prepare(`INSERT INTO "${this.table}" (id, data) VALUES (?, ?)`);
      for (const entry of entries) {
        const { id, ...data } = entry as any;
        insert.run(id, JSON.stringify(data));
      }
    });

    return entries;
  }

  /** {@inheritDoc IPersistentStorage.list} */
  list(): T[] {
    this.ensure();
    const rows = PersistentStorageSqlite.prepare(`SELECT id, data FROM "${this.table}"`).all() as { id: string; data: string }[];
    return rows.map((row) => ({ id: row.id, ...JSON.parse(row.data) }) as T);
  }

  /** {@inheritDoc IPersistentStorage.get} */
  get(id: string): T {
    this.ensure();
    const row = PersistentStorageSqlite.prepare(`SELECT id, data FROM "${this.table}" WHERE id = ?`).get(id) as
      | { id: string; data: string }
      | undefined;
    if (!row) return undefined as any;
    return { id: row.id, ...JSON.parse(row.data) } as T;
  }

  /** {@inheritDoc IPersistentStorage.delete} */
  delete(id: string): void {
    this.ensure();
    PersistentStorageSqlite.prepare(`DELETE FROM "${this.table}" WHERE id = ?`).run(id);
  }

  /** {@inheritDoc IPersistentStorage.writeDataFile} */
  writeDataFile(fileName: string, content: any): string {
    const fullPath = path.join(getStorageDir(), fileName);
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
      PersistentStorageSqlite.statementCache.clear();
      PersistentStorageSqlite.transactionDepth = 0;
    }
  }

  /**
   * Overrides the database connection with the provided instance. Used for testing with `:memory:` databases.
   * @param db - The database instance to use.
   */
  static setDb(db: DatabaseSync): void {
    PersistentStorageSqlite.db = db;
    PersistentStorageSqlite.ensuredTables.clear();
    PersistentStorageSqlite.statementCache.clear();
    PersistentStorageSqlite.transactionDepth = 0;
  }
}

export default PersistentStorageSqlite;
