/** MySQL adapter using mysql2/promise for async, high-performance database access. */
import mysql from "mysql2/promise";
import { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/** System databases to exclude from getDatabases() results. */
const SYSTEM_DATABASES = ["information_schema", "performance_schema", "mysql", "sys"];

/**
 * Data adapter for MySQL databases using mysql2/promise.
 * Also serves as the base for the MariaDB adapter.
 */
export default class MySQLDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect?: SqluiCore.Dialect;
  private _pool?: mysql.Pool;

  /**
   * Creates a MySQLDataAdapter instance.
   * @param connectionOption - The connection URL string (e.g., "mysql://root:pass@localhost:3306").
   */
  constructor(connectionOption: string) {
    super(connectionOption);
    this.connectionOption = this.connectionOption.replace("sslmode=require", "sslmode=no-verify");
  }

  /**
   * Creates or returns an existing mysql2 connection pool.
   * @returns The mysql2 Pool instance.
   */
  private getPool(): mysql.Pool {
    if (this._pool) {
      return this._pool;
    }

    let connectionUrl = this.connectionOption;
    if (this.dialect === "mariadb") {
      connectionUrl = connectionUrl.replace("mariadb://", "mysql://");
    }

    try {
      this._pool = mysql.createPool({
        uri: connectionUrl,
        waitForConnections: true,
        connectionLimit: 1,
        connectTimeout: MAX_CONNECTION_TIMEOUT,
        multipleStatements: true,
      });
      return this._pool;
    } catch (err) {
      console.error("MySQLDataAdapter:getPool", err);
      throw err;
    }
  }

  /**
   * Gets a connection from the pool, optionally switching to a specific database.
   * @param database - The database to switch to via USE statement.
   * @returns A mysql2 PoolConnection.
   */
  private async getConnection(database?: string): Promise<mysql.PoolConnection> {
    const pool = this.getPool();
    const conn = await pool.getConnection();
    if (database) {
      await conn.query(`USE \`${database}\``);
    }
    return conn;
  }

  /** Closes the mysql2 connection pool. */
  async disconnect() {
    try {
      await this._pool?.end();
    } catch (err) {
      console.error("MySQLDataAdapter:disconnect", err);
    }
    this._pool = undefined;
  }

  /** Tests the database connection by running a simple query. */
  async authenticate() {
    const pool = this.getPool();
    await pool.query("SELECT 1");
  }

  /** Retrieves all non-system databases. */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const pool = this.getPool();
    const [rows] = await pool.query("SHOW DATABASES");

    return (rows as { Database: string }[])
      .map((row) => row.Database)
      .filter((db) => db && !SYSTEM_DATABASES.includes(db.toLowerCase()))
      .map((name) => ({ name, tables: [] }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  /**
   * Retrieves all tables for a given database.
   * @param database - The database name.
   */
  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    const pool = this.getPool();
    const [rows] = await pool.query(
      `SELECT TABLE_NAME as tablename FROM information_schema.tables WHERE TABLE_SCHEMA = ? ORDER BY tablename`,
      [database],
    );

    return (rows as { tablename: string }[])
      .map((row) => row.tablename)
      .filter((name) => name)
      .map((name) => ({ name, columns: [] }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  /**
   * Retrieves column metadata and foreign key references for a table.
   * @param table - The table name.
   * @param database - The database name.
   */
  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    const conn = await this.getConnection(database);

    const columns: SqluiCore.ColumnMetaData[] = [];

    try {
      const [rows] = await conn.query(`SHOW FULL COLUMNS FROM \`${table}\``);

      for (const row of rows as any[]) {
        columns.push({
          name: row.Field,
          type: row.Type,
          allowNull: row.Null === "YES",
          defaultValue: row.Default ?? undefined,
          primaryKey: row.Key === "PRI",
          unique: row.Key === "UNI",
          comment: row.Comment || undefined,
        });
      }
    } catch (err) {
      console.error("MySQLDataAdapter:getColumns:showColumns", err);
    }

    try {
      const [fkRows] = await conn.query(
        `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
        [database, table],
      );

      for (const fk of fkRows as any[]) {
        const targetColumn = columns.find((col) => col.name === fk.COLUMN_NAME);
        if (targetColumn) {
          targetColumn.kind = "foreign_key";
          targetColumn.referencedTableName = fk.REFERENCED_TABLE_NAME;
          targetColumn.referencedColumnName = fk.REFERENCED_COLUMN_NAME;
        }
      }
    } catch (err) {
      console.error("MySQLDataAdapter:getColumns:foreignKeys", err);
    } finally {
      conn.release();
    }

    return columns;
  }

  /**
   * Executes a raw SQL query against the specified database.
   * @param sql - The SQL query string to execute.
   * @param database - The target database name.
   */
  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    const conn = await this.getConnection(database);

    try {
      const [rawResult] = await conn.query(sql);

      if (Array.isArray(rawResult)) {
        return { ok: true, raw: rawResult as any };
      } else {
        const resultHeader = rawResult as mysql.ResultSetHeader;
        return { ok: true, affectedRows: resultHeader.affectedRows };
      }
    } catch (error) {
      console.error("MySQLDataAdapter:execute", error);
      return { ok: false, error };
    } finally {
      conn.release();
    }
  }
}
