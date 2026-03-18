import qs from "qs";
import { Options, Sequelize } from "sequelize";
import { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";
function _getDefaultSequelizeOptions(): Options {
  return {
    logging: false,
    dialectOptions: {
      multipleStatements: true,
      connectTimeout: MAX_CONNECTION_TIMEOUT,
    },
    pool: {
      max: 1,
      min: 0,
      acquire: MAX_CONNECTION_TIMEOUT,
    },
  };
}

/**
 * Data adapter for relational databases (MySQL, MariaDB, MSSQL, PostgreSQL, SQLite)
 * using Sequelize as the underlying ORM.
 * @see https://sequelize.org/master/class/lib/dialects/abstract/query-interface.js~QueryInterface.html
 */
export default class RelationalDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect?: SqluiCore.Dialect;

  constructor(connectionOption: string) {
    super(connectionOption);

    // TODO: we don't support sslmode, this will attempt to override the option
    this.connectionOption = this.connectionOption.replace("sslmode=require", "sslmode=no-verify");
  }

  private getConnection(database: string = ""): Sequelize {
    let connectionUrl: string;
    let connectionPropOptions = _getDefaultSequelizeOptions();

    switch (this.dialect) {
      case "sqlite":
        database = "";

        // special handling for sqlite path
        const sqliteStorageOption = this.connectionOption.replace("sqlite://", "").replace(/\\/g, "/"); // uses :memory: for in memory

        connectionUrl = `sqlite://`;
        connectionPropOptions = {
          ...connectionPropOptions,
          storage: sqliteStorageOption, // applicable for sqlite
        };
        break;

      default:
        connectionUrl = this.connectionOption;
        if (database) {
          //@ts-ignore
          const { scheme, username, password, hosts, options } = BaseDataAdapter.getConnectionParameters(connectionUrl);

          connectionUrl = `${scheme}://`;
          if (username && password) {
            connectionUrl += `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
          }

          const [{ host, port }] = hosts;
          connectionUrl += `@${host}:${port}`;

          if (database) {
            connectionUrl += `/${database}`;
          }

          if (options) {
            connectionUrl += `?${qs.stringify(options)}`;
          }
        }

        if (this.dialect === "mariadb") {
          // NOTES: because mariadb and mysql are compatbile, we can use mysql here to replace it...
          connectionUrl = connectionUrl.replace("mariadb://", "mysql://");
        }
        break;
    }

    try {
      return new Sequelize(connectionUrl, connectionPropOptions);
    } catch (err) {
      console.error("RelationalDataAdapter:getConnection", connectionUrl, connectionPropOptions, err);
      throw err;
    }
  }

  /** Disconnects and cleans up resources. No-op since connections are per-operation. */
  async disconnect() {}

  /** Tests the database connection by authenticating and then closing. */
  async authenticate() {
    const connection = this.getConnection();
    try {
      await connection.authenticate();
    } finally {
      await connection.close();
    }
  }

  /** Retrieves all databases using dialect-specific SQL queries. */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    let sql;

    switch (this.dialect) {
      case "mssql":
        sql = `SELECT name AS 'database' FROM sys.databases`;
        break;
      case "postgres":
      case "postgresql":
        sql = `SELECT datname AS database FROM pg_database`;
        break;
      case "sqlite":
        // because SQLITE doesn't have a concept of database
        // so we will hard code this as sqlite here
        // so that the ui will show up
        return [
          {
            name: "Sqlite",
            tables: [], // TODO: will remove this entirely
          },
        ];
      case "mariadb":
      case "mysql":
        sql = `show databases`;
        break;
    }

    if (!sql) {
      return [];
    }

    const [data] = await this._execute(sql);

    const SYSTEM_DATABASES: Record<string, string[]> = {
      mysql: ["information_schema", "performance_schema", "mysql", "sys"],
      mariadb: ["information_schema", "performance_schema", "mysql", "sys"],
      mssql: ["master", "tempdb", "model", "msdb"],
      postgres: ["template0", "template1"],
      postgresql: ["template0", "template1"],
    };

    return data
      .map(
        (row: any) =>
          row.Database || // mssql and mysql
          row.database, // postgres
      )
      .filter((db) => db)
      .filter((db) => {
        const excluded = SYSTEM_DATABASES[this.dialect || ""] || [];
        return !excluded.includes(db.toLowerCase());
      })
      .map((name) => ({
        name,
        tables: [], // TODO: will remove this entirely
      }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  /**
   * Retrieves all tables for a given database using dialect-specific SQL.
   * @param database - The database name.
   */
  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // https://github.com/knex/knex/issues/360
    // PostgreSQL: SELECT tablename FROM pg_tables WHERE schemaname='public''
    // MySQL: SELECT TABLE_SCHEMA FROM information_schema.tables GROUP BY TABLE_SCHEMA;
    // SQLite3: SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%sqlite%';
    let sql;

    switch (this.dialect) {
      case "mssql":
        sql = `SELECT name AS 'tablename' FROM SYSOBJECTS WHERE xtype = 'U' ORDER BY tablename`;
        break;
      case "postgres":
      case "postgresql":
        sql = `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
        break;
      default:
      case "sqlite":
        sql = `SELECT name AS tablename FROM sqlite_master WHERE type='table' AND name NOT LIKE '%sqlite%' ORDER BY tablename`;
        break;
      case "mariadb":
      case "mysql":
        sql = `SELECT TABLE_NAME as tablename FROM information_schema.tables WHERE TABLE_SCHEMA = '${database}' ORDER BY tablename`;
        break;
    }

    if (!sql) {
      return [];
    }

    const [data] = await this._execute(sql, database);

    return data
      .map((row: any) => row.tablename)
      .filter((db) => db)
      .map((name) => ({
        name,
        columns: [], // TODO: will remove this entirely
      }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  /**
   * Retrieves column metadata and foreign key references for a table.
   * @param table - The table name.
   * @param database - The database name.
   */
  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    const connection = this.getConnection(database);
    try {
      const queryInterface = connection.getQueryInterface();

      // first get all the columns
      const columns: SqluiCore.ColumnMetaData[] = [];
      try {
        const columnMap = await queryInterface.describeTable(table);

        for (const columnName of Object.keys(columnMap)) {
          columns.push({
            name: columnName,
            ...columnMap[columnName],
          });
        }
      } catch (err) {
        console.error("RelationalDataAdapter:getColumns:describeTable", err);
      }

      // then see if we attempt to add additional foreignKey constraint
      try {
        const foreignKeyReferences = (await queryInterface.getForeignKeyReferencesForTable(table)) as any[];

        for (const foreignKeyReference of foreignKeyReferences) {
          const fromTableName = foreignKeyReference.tableName;
          const fromColumnName = foreignKeyReference.columnName;
          const toTableName = foreignKeyReference.referencedTableName;
          const toColumnName = foreignKeyReference.referencedColumnName;

          if (fromTableName === table) {
            const targetColumn = columns.find((column) => column.name === fromColumnName);

            if (targetColumn) {
              targetColumn.kind = "foreign_key";
              targetColumn.referencedTableName = toTableName;
              targetColumn.referencedColumnName = toColumnName;
            }
          }
        }
      } catch (err) {
        console.error("RelationalDataAdapter:getColumns:getForeignKeyReferences", err);
      }

      return columns;
    } finally {
      await connection.close();
    }
  }

  /**
   * Executes a raw SQL query and returns the result with dialect-specific metadata handling.
   * @param sql - The SQL query string to execute.
   * @param database - The target database name.
   * @returns The query result including raw data, metadata, and affected rows.
   */
  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    // https://sequelize.org/master/manual/raw-queries.html
    //@ts-ignore
    const connection = this.getConnection(database);
    try {
      const [raw, meta] = await connection.query(sql, {
        raw: true,
        plain: false,
      });

      let rawToUse: any | undefined = raw;
      let metaToUse: any | undefined = meta;
      let affectedRows;

      switch (this.dialect) {
        case "mssql":
          affectedRows = metaToUse;
          break;
        case "postgres":
        case "postgresql":
          if (metaToUse.rowCount >= 0) {
            affectedRows = metaToUse.rowCount;
          }
          // Postgres returns a lot of redundant data, best to remove it to save space...
          metaToUse = undefined;
          break;
        case "sqlite":
          if (metaToUse.changes >= 0) {
            affectedRows = metaToUse.changes;
          } else {
            metaToUse = undefined;
          }
          break;
        case "mariadb":
        case "mysql":
          if (metaToUse?.affectedRows) {
            // these are likely insert / update calls
            // these don't need raw data
            rawToUse = undefined;
            affectedRows = metaToUse?.affectedRows;
          } else {
            // these are select calls, we don't need the meta
            metaToUse = undefined;
          }
        default:
          break;
      }

      return {
        ok: true,
        raw: rawToUse,
        meta: metaToUse,
        affectedRows,
      };
    } catch (error) {
      console.error("RelationalDataAdapter:execute", error);
      return {
        ok: false,
        error,
      };
    } finally {
      await connection.close();
    }
  }

  private async _execute(sql: string, database?: string): Promise<[SqluiCore.RawData, SqluiCore.MetaData]> {
    // https://sequelize.org/master/manual/raw-queries.html
    const connection = this.getConnection(database);
    try {
      //@ts-ignore
      return await connection.query(sql, {
        raw: true,
        plain: false,
      });
    } finally {
      await connection.close();
    }
  }
}
