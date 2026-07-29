/** SQLite adapter using node:sqlite for synchronous, high-performance database access. */
import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/** Regex matching SQL statements that return rows (SELECT, PRAGMA, EXPLAIN, WITH). */
const SELECT_PATTERN = /^\s*(SELECT|PRAGMA|EXPLAIN|WITH)\b/i;

/** SQLite header magic bytes: "SQLite format 3\0" (16 bytes). */
const SQLITE_HEADER_MAGIC = "SQLite format 3\0";

/**
 * Inspects a SQLite file on disk and classifies it as missing / empty / invalid / ok.
 * Used to surface user-friendly errors instead of letting node:sqlite silently
 * auto-create a fresh DB on a typo'd path.
 * @param storagePath - The resolved file path (already stripped of the sqlite:// scheme).
 * @returns A classification tag for the file at the given path.
 */
function classifySqliteFile(storagePath: string): "missing" | "empty" | "invalid" | "ok" {
  if (!fs.existsSync(storagePath)) {
    return "missing";
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(storagePath);
  } catch {
    return "missing";
  }

  if (stat.size === 0) {
    return "empty";
  }

  // Files smaller than the 16-byte SQLite header can't possibly be a valid DB.
  if (stat.size < SQLITE_HEADER_MAGIC.length) {
    return "invalid";
  }

  let fd: number | undefined;
  try {
    fd = fs.openSync(storagePath, "r");
    const buf = Buffer.alloc(SQLITE_HEADER_MAGIC.length);
    fs.readSync(fd, buf, 0, SQLITE_HEADER_MAGIC.length, 0);
    if (buf.toString("binary") !== SQLITE_HEADER_MAGIC) {
      return "invalid";
    }
  } catch {
    return "invalid";
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // best-effort cleanup
      }
    }
  }

  return "ok";
}

/**
 * Data adapter for SQLite databases using node:sqlite.
 * Provides synchronous, high-performance access with no native module compilation.
 */
export default class SQLiteDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect?: SqluiCore.Dialect;
  private _connection?: DatabaseSync;

  /**
   * Creates a SQLiteDataAdapter instance.
   * @param connectionOption - The connection URL string (e.g., "sqlite://path.sqlite" or "sqlite://:memory:").
   */
  constructor(connectionOption: string) {
    super(connectionOption);
  }

  /** Resolved file path for diagnostics (stripped of the sqlite:// scheme). */
  private _storagePath?: string;
  /** Cached file classification used to short-circuit table/column lookups. */
  private _fileState?: "missing" | "empty" | "invalid" | "ok" | "memory";

  /**
   * Resolves and validates the SQLite file path.
   * Throws user-friendly errors for missing or non-SQLite files so the UI can
   * display the cause instead of a generic "Not Available". Empty (0-byte)
   * files are allowed — node:sqlite treats them as fresh blank databases —
   * but get tagged so callers can surface a friendly "this file is empty" hint.
   */
  private resolveStoragePath(): string {
    if (this._storagePath !== undefined) {
      return this._storagePath;
    }

    // Strip the "sqlite://" scheme and normalize Windows backslashes to forward slashes
    const storagePath = this.connectionOption.replace("sqlite://", "").replace(/\\/g, "/");
    this._storagePath = storagePath;

    if (storagePath === ":memory:") {
      this._fileState = "memory";
      return storagePath;
    }

    const state = classifySqliteFile(storagePath);
    this._fileState = state;

    if (state === "missing") {
      // Create the file — node:sqlite will treat an empty file as a fresh blank database.
      // This matches SQLite's standard behavior of auto-creating files on connect.
      fs.writeFileSync(storagePath, "");
      this._fileState = "empty";
      return storagePath;
    }
    if (state === "invalid") {
      throw new Error(`Invalid SQLite file: ${storagePath} (not a SQLite database)`);
    }
    // "empty" and "ok" are both openable — node:sqlite will treat an empty file as a blank DB.
    return storagePath;
  }

  /**
   * Opens the SQLite database file and returns the connection.
   * @returns The node:sqlite DatabaseSync instance.
   */
  private getConnection(): DatabaseSync {
    if (this._connection) {
      return this._connection;
    }

    const storagePath = this.resolveStoragePath();

    try {
      this._connection = new DatabaseSync(storagePath);
      this._connection.exec(`PRAGMA busy_timeout = ${MAX_CONNECTION_TIMEOUT}`);
      return this._connection;
    } catch (err) {
      console.error("SQLiteDataAdapter:getConnection", storagePath, err);
      throw err;
    }
  }

  /** Closes the SQLite database connection. */
  async disconnect() {
    try {
      this._connection?.close();
    } catch (err) {
      console.error("SQLiteDataAdapter:disconnect", err);
    }
    this._connection = undefined;
  }

  /** Validates the database connection by opening the file. */
  async authenticate() {
    this.getConnection();
  }

  /**
   * Returns a hardcoded database list since SQLite has no concept of multiple databases.
   * @returns A single "Sqlite" database entry.
   */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    return [
      {
        name: "Sqlite",
        tables: [],
      },
    ];
  }

  /**
   * Retrieves all user tables from the SQLite database.
   * Surfaces a friendly error when the underlying file is empty so the tree UI
   * shows "this file is empty" instead of a generic "Not Available".
   * @param _database - Ignored for SQLite (single database per file).
   */
  async getTables(_database?: string): Promise<SqluiCore.TableMetaData[]> {
    const db = this.getConnection();

    // An empty (0-byte) file is a legal blank DB — opening succeeds, but there
    // are no tables and node:sqlite hasn't written a header yet. Surface the
    // state so the UI can guide the user (typed wrong path? freshly created?).
    if (this._fileState === "empty") {
      throw new Error(`SQLite file is empty (no tables yet): ${this._storagePath}`);
    }

    const rows = db
      .prepare(
        `SELECT name AS tablename FROM sqlite_master WHERE type='table' AND name NOT LIKE '%sqlite%' ORDER BY tablename`,
      )
      .all() as { tablename: string }[];

    return rows
      .map((row) => row.tablename)
      .filter((name) => name)
      .map((name) => ({ name, columns: [] }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  /**
   * Retrieves column metadata for a table using PRAGMA queries.
   * @param table - The table name.
   * @param _database - Ignored for SQLite.
   */
  async getColumns(table: string, _database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    const db = this.getConnection();

    const columns: SqluiCore.ColumnMetaData[] = [];

    try {
      const rawColumns = db.prepare(`PRAGMA table_info(\`${table}\`)`).all() as {
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
        pk: number;
      }[];

      for (const col of rawColumns) {
        columns.push({
          name: col.name,
          type: col.type,
          allowNull: col.notnull === 0,
          defaultValue: col.dflt_value ?? undefined,
          primaryKey: col.pk > 0,
          unique: false,
        });
      }
    } catch (err) {
      console.error("SQLiteDataAdapter:getColumns:tableInfo", err);
    }

    try {
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list(\`${table}\`)`).all() as {
        id: number;
        seq: number;
        table: string;
        from: string;
        to: string;
      }[];

      for (const fk of foreignKeys) {
        const targetColumn = columns.find((col) => col.name === fk.from);
        if (targetColumn) {
          targetColumn.kind = "foreign_key";
          targetColumn.referencedTableName = fk.table;
          targetColumn.referencedColumnName = fk.to;
        }
      }
    } catch (err) {
      console.error("SQLiteDataAdapter:getColumns:foreignKeys", err);
    }

    return columns;
  }

  /**
   * Executes a SQL statement against the SQLite database.
   * Auto-detects SELECT-like queries vs mutations.
   * @param sql - The SQL statement to execute.
   * @param _database - Ignored for SQLite.
   */
  async execute(sql: string, _database?: string): Promise<SqluiCore.Result> {
    const db = this.getConnection();

    try {
      if (SELECT_PATTERN.test(sql)) {
        const raw = db.prepare(sql).all();
        return { ok: true, raw };
      } else {
        const result = db.prepare(sql).run();
        return { ok: true, affectedRows: Number(result.changes) };
      }
    } catch (error) {
      console.error("SQLiteDataAdapter:execute", error);
      return { ok: false, error };
    }
  }
}
