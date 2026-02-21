import qs from "qs";
import { Options, Sequelize } from "sequelize";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";
function _getDefaultSequelizeOptions(): Options {
  return {
    logging: false,
    dialectOptions: {
      multipleStatements: true,
    },
    pool: {
      max: 1,
      min: 0,
    },
  };
}

/**
 * mostly adapter for sequelize
 * https://sequelize.org/master/class/lib/dialects/abstract/query-interface.js~QueryInterface.html
 */
export default class RelationalDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect?: SqluiCore.Dialect;

  constructor(connectionOption: string) {
    super(connectionOption);

    // since mariadb and mysql are fully compatible, let's use the same data
    // save the connection string
    this.connectionOption = this.connectionOption.replace("mariadb://", "mysql://");

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
        let sqliteStorageOption = this.connectionOption.replace("sqlite://", "").replace(/\\/g, "/"); // uses :memory: for in memory

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
        break;
    }

    // Pass dialectModule explicitly so Sequelize doesn't rely on dynamic require()
    // which fails in packaged Electron apps (e.g., tedious for mssql)
    try {
      switch (this.dialect) {
        case "mssql":
          connectionPropOptions.dialectModule = require("tedious");
          break;
        case "mariadb":
          connectionPropOptions.dialectModule = require("mariadb");
          break;
        case "mysql":
          connectionPropOptions.dialectModule = require("mysql2");
          break;
        case "postgres":
        case "postgresql":
          connectionPropOptions.dialectModule = require("pg");
          break;
      }
    } catch (_) {
      // dialect module not available, let Sequelize handle the error
    }

    try {
      return new Sequelize(connectionUrl, connectionPropOptions);
    } catch (err) {
      console.log("Failed to set up Sequelize for RelationalDataAdapter", connectionUrl, connectionPropOptions);
      throw err;
    }
  }

  async authenticate() {
    const connection = this.getConnection();
    try {
      await connection.authenticate();
    } finally {
      await connection.close();
    }
  }

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

    return data
      .map(
        (row: any) =>
          row.Database || // mssql and mysql
          row.database, // postgres
      )
      .filter((db) => db)
      .map((name) => ({
        name,
        tables: [], // TODO: will remove this entirely
      }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // https://github.com/knex/knex/issues/360
    // PostgreSQL: SELECT tablename FROM pg_tables WHERE schemaname='public''
    // MySQL: SELECT TABLE_SCHEMA FROM information_schema.tables GROUP BY TABLE_SCHEMA;
    // SQLite3: SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%sqlite%';
    let sql;
    let data;

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

    [data] = await this._execute(sql, database);

    return data
      .map((row: any) => row.tablename)
      .filter((db) => db)
      .map((name) => ({
        name,
        columns: [], // TODO: will remove this entirely
      }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    switch (this.dialect) {
      case "mssql":
      case "postgres":
      case "postgresql":
      case "sqlite":
      case "mariadb":
      case "mysql":
      default:
        // first get all the columns
        const columns: SqluiCore.ColumnMetaData[] = [];
        {
          const connection = this.getConnection(database);
          try {
            const columnMap = await connection.getQueryInterface().describeTable(table);

            for (const columnName of Object.keys(columnMap)) {
              columns.push({
                name: columnName,
                ...columnMap[columnName],
              });
            }
          } catch (err) {
          } finally {
            await connection.close();
          }
        }

        // then see if we attempt to add additional foreignKey constraint
        {
          const connection = this.getConnection(database);
          try {
            const foreignKeyReferences = (await connection.getQueryInterface().getForeignKeyReferencesForTable(table)) as any[];

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
          } finally {
            await connection.close();
          }
        }

        return columns;
    }
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    // https://sequelize.org/master/manual/raw-queries.html
    //@ts-ignore
    const connection = this.getConnection(database);
    try {
      let [raw, meta] = await connection.query(sql, {
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
