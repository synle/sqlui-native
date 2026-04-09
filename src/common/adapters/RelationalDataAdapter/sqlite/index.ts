/** SQLite adapter using better-sqlite3 for synchronous, high-performance database access. */
import fs from "fs";
import Database from "better-sqlite3";
import { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/** Regex matching SQL statements that return rows (SELECT, PRAGMA, EXPLAIN, WITH). */
const SELECT_PATTERN = /^\s*(SELECT|PRAGMA|EXPLAIN|WITH)\b/i;

/**
 * Data adapter for SQLite databases using better-sqlite3.
 * Provides synchronous, high-performance access ideal for Electron apps.
 */
export default class SQLiteDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect?: SqluiCore.Dialect;
  private _connection?: Database.Database;

  /**
   * Creates a SQLiteDataAdapter instance.
   * @param connectionOption - The connection URL string (e.g., "sqlite://path.sqlite" or "sqlite://:memory:").
   */
  constructor(connectionOption: string) {
    super(connectionOption);
  }

  /**
   * Opens the SQLite database file and returns the connection.
   * @returns The better-sqlite3 Database instance.
   */
  private getConnection(): Database.Database {
    if (this._connection) {
      return this._connection;
    }

    // Strip the "sqlite://" scheme and normalize Windows backslashes to forward slashes
    const storagePath = this.connectionOption.replace("sqlite://", "").replace(/\\/g, "/");

    if (storagePath !== ":memory:" && !fs.existsSync(storagePath)) {
      throw new Error(`SQLite database file not found: ${storagePath}`);
    }

    try {
      this._connection = new Database(storagePath, { timeout: MAX_CONNECTION_TIMEOUT });
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
   * @param _database - Ignored for SQLite (single database per file).
   */
  async getTables(_database?: string): Promise<SqluiCore.TableMetaData[]> {
    const db = this.getConnection();
    const rows = db
      .prepare(`SELECT name AS tablename FROM sqlite_master WHERE type='table' AND name NOT LIKE '%sqlite%' ORDER BY tablename`)
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
        return { ok: true, affectedRows: result.changes };
      }
    } catch (error) {
      console.error("SQLiteDataAdapter:execute", error);
      return { ok: false, error };
    }
  }
}
