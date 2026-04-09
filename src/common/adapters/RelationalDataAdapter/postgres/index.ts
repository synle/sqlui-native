/** PostgreSQL adapter using pg (node-postgres) for async database access. */
import qs from "qs";
import pg from "pg";
import { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/** System databases to exclude from getDatabases() results. */
const SYSTEM_DATABASES = ["template0", "template1"];

/**
 * Data adapter for PostgreSQL databases using the pg (node-postgres) driver.
 * Creates a new pg.Client per database since PostgreSQL doesn't support USE statements.
 */
export default class PostgresDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect?: SqluiCore.Dialect;
  private _clients: Map<string, pg.Client> = new Map();

  /**
   * Creates a PostgresDataAdapter instance.
   * @param connectionOption - The connection URL string (e.g., "postgres://user:pass@localhost:5432").
   */
  constructor(connectionOption: string) {
    super(connectionOption);
    this.connectionOption = this.connectionOption.replace("sslmode=require", "sslmode=no-verify");
  }

  /**
   * Gets or creates a pg.Client for a specific database.
   * PostgreSQL requires a new connection per database — you can't USE another database on an open connection.
   * @param database - The database name to connect to.
   * @returns A connected pg.Client instance.
   */
  private async getClient(database?: string): Promise<pg.Client> {
    const cacheKey = database || "__default__";

    const existing = this._clients.get(cacheKey);
    if (existing) {
      return existing;
    }

    let connectionUrl = this.connectionOption;

    if (database) {
      //@ts-ignore
      const { scheme, username, password, hosts, options } = BaseDataAdapter.getConnectionParameters(connectionUrl);

      connectionUrl = `${scheme}://`;
      if (username && password) {
        connectionUrl += `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
      }

      const [{ host, port }] = hosts;
      connectionUrl += `@${host}:${port}`;
      connectionUrl += `/${database}`;

      if (options) {
        connectionUrl += `?${qs.stringify(options)}`;
      }
    }

    try {
      const client = new pg.Client({
        connectionString: connectionUrl,
        connectionTimeoutMillis: MAX_CONNECTION_TIMEOUT,
      });
      await client.connect();
      this._clients.set(cacheKey, client);
      return client;
    } catch (err) {
      console.error("PostgresDataAdapter:getClient", err);
      throw err;
    }
  }

  /** Closes all pg.Client connections held by this adapter. */
  async disconnect() {
    for (const [_key, client] of this._clients) {
      try {
        await client.end();
      } catch (err) {
        console.error("PostgresDataAdapter:disconnect", err);
      }
    }
    this._clients.clear();
  }

  /** Tests the database connection by running a simple query. */
  async authenticate() {
    const client = await this.getClient();
    await client.query("SELECT 1");
  }

  /** Retrieves all non-system databases. */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const client = await this.getClient();
    const result = await client.query("SELECT datname AS database FROM pg_database");

    return result.rows
      .map((row) => row.database)
      .filter((db: string) => db && !SYSTEM_DATABASES.includes(db.toLowerCase()))
      .map((name: string) => ({ name, tables: [] }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  /**
   * Retrieves all tables in the public schema for a given database.
   * @param database - The database name.
   */
  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    const client = await this.getClient(database);
    const result = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);

    return result.rows
      .map((row) => row.tablename)
      .filter((name: string) => name)
      .map((name: string) => ({ name, columns: [] }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  /**
   * Retrieves column metadata and foreign key references for a table.
   * @param table - The table name.
   * @param database - The database name.
   */
  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    const client = await this.getClient(database);

    const columns: SqluiCore.ColumnMetaData[] = [];

    try {
      const colResult = await client.query(
        `SELECT
          c.column_name AS name,
          c.data_type AS type,
          c.is_nullable,
          c.column_default,
          CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS primary_key,
          CASE WHEN uc.constraint_type = 'UNIQUE' THEN true ELSE false END AS is_unique
        FROM information_schema.columns c
        LEFT JOIN information_schema.key_column_usage kcu
          ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name AND c.table_schema = kcu.table_schema
        LEFT JOIN information_schema.table_constraints tc
          ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = c.table_schema
        LEFT JOIN information_schema.table_constraints uc
          ON kcu.constraint_name = uc.constraint_name AND uc.constraint_type = 'UNIQUE' AND uc.table_schema = c.table_schema
        WHERE c.table_name = $1 AND c.table_schema = 'public'
        ORDER BY c.ordinal_position`,
        [table],
      );

      for (const row of colResult.rows) {
        columns.push({
          name: row.name,
          type: row.type.toUpperCase(),
          allowNull: row.is_nullable === "YES",
          defaultValue: row.column_default ?? undefined,
          primaryKey: row.primary_key === true,
          unique: row.is_unique === true,
        });
      }
    } catch (err) {
      console.error("PostgresDataAdapter:getColumns:columns", err);
    }

    try {
      const fkResult = await client.query(
        `SELECT
          kcu.column_name,
          ccu.table_name AS referenced_table_name,
          ccu.column_name AS referenced_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
        WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`,
        [table],
      );

      for (const fk of fkResult.rows) {
        const targetColumn = columns.find((col) => col.name === fk.column_name);
        if (targetColumn) {
          targetColumn.kind = "foreign_key";
          targetColumn.referencedTableName = fk.referenced_table_name;
          targetColumn.referencedColumnName = fk.referenced_column_name;
        }
      }
    } catch (err) {
      console.error("PostgresDataAdapter:getColumns:foreignKeys", err);
    }

    return columns;
  }

  /**
   * Executes a raw SQL query against the specified database.
   * @param sql - The SQL query string to execute.
   * @param database - The target database name.
   */
  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    const client = await this.getClient(database);

    try {
      const result = await client.query(sql);

      if (result.rows && result.rows.length > 0) {
        return { ok: true, raw: result.rows };
      } else if (result.rowCount !== null && result.rowCount >= 0) {
        return { ok: true, raw: result.rows, affectedRows: result.rowCount };
      }

      return { ok: true, raw: result.rows };
    } catch (error) {
      console.error("PostgresDataAdapter:execute", error);
      return { ok: false, error };
    }
  }
}
