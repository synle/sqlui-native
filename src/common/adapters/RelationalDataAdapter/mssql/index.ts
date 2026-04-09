/** MSSQL adapter using tedious for direct TDS protocol access to SQL Server. */
import { Connection, Request } from "tedious";
import { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/** System databases to exclude from getDatabases() results. */
const SYSTEM_DATABASES = ["master", "tempdb", "model", "msdb"];

/**
 * Data adapter for MSSQL (SQL Server) databases using the tedious driver.
 * Wraps the callback-based tedious API in promises.
 */
export default class MSSQLDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect?: SqluiCore.Dialect;
  private _connection?: Connection;

  /**
   * Creates a MSSQLDataAdapter instance.
   * @param connectionOption - The connection URL string (e.g., "mssql://sa:password@localhost:1433").
   */
  constructor(connectionOption: string) {
    super(connectionOption);
    this.connectionOption = this.connectionOption.replace("sslmode=require", "sslmode=no-verify");
  }

  /**
   * Parses the connection URL into tedious config format.
   * @param database - Optional database name to connect to.
   * @returns A tedious Connection config object.
   */
  private getConfig(database?: string) {
    //@ts-ignore
    const params = BaseDataAdapter.getConnectionParameters(this.connectionOption);

    const host = params?.hosts?.[0]?.host || "localhost";
    const port = params?.hosts?.[0]?.port || 1433;
    const userName = params?.username || "";
    const password = params?.password || "";

    return {
      server: host,
      authentication: {
        type: "default" as const,
        options: {
          userName,
          password,
        },
      },
      options: {
        port: typeof port === "string" ? parseInt(port, 10) : port || 1433,
        database: database || undefined,
        encrypt: false,
        trustServerCertificate: true,
        connectTimeout: MAX_CONNECTION_TIMEOUT,
        requestTimeout: MAX_CONNECTION_TIMEOUT,
        rowCollectionOnRequestCompletion: true,
      },
    };
  }

  /**
   * Creates a new tedious Connection and waits for it to connect.
   * @param database - Optional database name.
   * @returns A connected tedious Connection.
   */
  private createConnection(database?: string): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const config = this.getConfig(database);
      const connection = new Connection(config);

      connection.on("connect", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(connection);
        }
      });

      connection.on("error", (err) => {
        console.error("MSSQLDataAdapter:connectionError", err);
      });

      connection.connect();
    });
  }

  /**
   * Gets or creates the main tedious Connection.
   * @returns A connected tedious Connection.
   */
  private async getConnection(): Promise<Connection> {
    if (this._connection) {
      return this._connection;
    }
    this._connection = await this.createConnection();
    return this._connection;
  }

  /**
   * Executes a SQL query using tedious and returns rows as objects.
   * @param sql - The SQL string to execute.
   * @param connection - The tedious Connection to use.
   * @returns An array of row objects.
   */
  private execQuery(sql: string, connection: Connection): Promise<{ rows: Record<string, any>[]; rowCount: number | undefined }> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, any>[] = [];

      const request = new Request(sql, (err, rowCount, tediousRows) => {
        if (err) {
          reject(err);
          return;
        }

        if (tediousRows) {
          for (const tediousRow of tediousRows) {
            const row: Record<string, any> = {};
            for (const col of tediousRow) {
              row[col.metadata.colName] = col.value;
            }
            rows.push(row);
          }
        }

        resolve({ rows, rowCount });
      });

      connection.execSql(request);
    });
  }

  /** Closes the tedious connection. */
  async disconnect() {
    try {
      if (this._connection) {
        await new Promise<void>((resolve) => {
          this._connection!.on("end", () => resolve());
          this._connection!.close();
        });
      }
    } catch (err) {
      console.error("MSSQLDataAdapter:disconnect", err);
    }
    this._connection = undefined;
  }

  /** Tests the database connection by connecting. */
  async authenticate() {
    await this.getConnection();
  }

  /** Retrieves all non-system databases. */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const connection = await this.getConnection();
    const { rows } = await this.execQuery(`SELECT name AS [database] FROM sys.databases`, connection);

    return rows
      .map((row) => row.database)
      .filter((db: string) => db && !SYSTEM_DATABASES.includes(db.toLowerCase()))
      .map((name: string) => ({ name, tables: [] }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  /**
   * Retrieves all user tables for a given database.
   * @param database - The database name.
   */
  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    let connection: Connection;
    let isTemporary = false;

    if (database) {
      connection = await this.createConnection(database);
      isTemporary = true;
    } else {
      connection = await this.getConnection();
    }

    try {
      const { rows } = await this.execQuery(`SELECT name AS [tablename] FROM SYSOBJECTS WHERE xtype = 'U' ORDER BY name`, connection);

      return rows
        .map((row) => row.tablename)
        .filter((name: string) => name)
        .map((name: string) => ({ name, columns: [] }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } finally {
      if (isTemporary) {
        connection.close();
      }
    }
  }

  /**
   * Retrieves column metadata and foreign key references for a table.
   * @param table - The table name.
   * @param database - The database name.
   */
  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    let connection: Connection;
    let isTemporary = false;

    if (database) {
      connection = await this.createConnection(database);
      isTemporary = true;
    } else {
      connection = await this.getConnection();
    }

    const columns: SqluiCore.ColumnMetaData[] = [];

    try {
      const { rows: colRows } = await this.execQuery(
        `SELECT
          c.COLUMN_NAME AS name,
          c.DATA_TYPE AS type,
          c.IS_NULLABLE AS is_nullable,
          c.COLUMN_DEFAULT AS column_default,
          CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS is_primary_key,
          COLUMNPROPERTY(OBJECT_ID(c.TABLE_SCHEMA + '.' + c.TABLE_NAME), c.COLUMN_NAME, 'IsIdentity') AS is_identity
        FROM INFORMATION_SCHEMA.COLUMNS c
        LEFT JOIN (
          SELECT ku.COLUMN_NAME
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
          JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
          WHERE tc.TABLE_NAME = '${table}' AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
        WHERE c.TABLE_NAME = '${table}'
        ORDER BY c.ORDINAL_POSITION`,
        connection,
      );

      for (const row of colRows) {
        columns.push({
          name: row.name,
          type: row.type.toUpperCase(),
          allowNull: row.is_nullable === "YES",
          defaultValue: row.column_default ?? undefined,
          primaryKey: row.is_primary_key === 1,
          autoIncrement: row.is_identity === 1 || undefined,
          unique: false,
        });
      }

      const { rows: fkRows } = await this.execQuery(
        `SELECT
          fk_col.COLUMN_NAME,
          pk_tab.TABLE_NAME AS REFERENCED_TABLE_NAME,
          pk_col.COLUMN_NAME AS REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE fk_col
          ON rc.CONSTRAINT_NAME = fk_col.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE pk_col
          ON rc.UNIQUE_CONSTRAINT_NAME = pk_col.CONSTRAINT_NAME
          AND fk_col.ORDINAL_POSITION = pk_col.ORDINAL_POSITION
        JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk_tab_c
          ON rc.UNIQUE_CONSTRAINT_NAME = pk_tab_c.CONSTRAINT_NAME
        JOIN INFORMATION_SCHEMA.TABLES pk_tab
          ON pk_tab_c.TABLE_NAME = pk_tab.TABLE_NAME
        WHERE fk_col.TABLE_NAME = '${table}'`,
        connection,
      );

      for (const fk of fkRows) {
        const targetColumn = columns.find((col) => col.name === fk.COLUMN_NAME);
        if (targetColumn) {
          targetColumn.kind = "foreign_key";
          targetColumn.referencedTableName = fk.REFERENCED_TABLE_NAME;
          targetColumn.referencedColumnName = fk.REFERENCED_COLUMN_NAME;
        }
      }
    } catch (err) {
      console.error("MSSQLDataAdapter:getColumns", err);
    } finally {
      if (isTemporary) {
        connection.close();
      }
    }

    return columns;
  }

  /**
   * Executes a raw SQL query against the specified database.
   * @param sql - The SQL query string to execute.
   * @param database - The target database name.
   */
  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    let connection: Connection;
    let isTemporary = false;

    if (database) {
      connection = await this.createConnection(database);
      isTemporary = true;
    } else {
      connection = await this.getConnection();
    }

    try {
      const { rows, rowCount } = await this.execQuery(sql, connection);

      if (rows.length > 0) {
        return { ok: true, raw: rows, affectedRows: rowCount };
      }

      return { ok: true, affectedRows: rowCount };
    } catch (error) {
      console.error("MSSQLDataAdapter:execute", error);
      return { ok: false, error };
    } finally {
      if (isTemporary) {
        connection.close();
      }
    }
  }
}
