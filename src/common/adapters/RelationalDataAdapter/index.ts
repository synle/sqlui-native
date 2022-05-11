import { Sequelize } from 'sequelize';
import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';
/**
 * mostly adapter for sequelize
 * https://sequelize.org/master/class/lib/dialects/abstract/query-interface.js~QueryInterface.html
 */
export default class RelationalDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect?: SqluiCore.Dialect;
  private sequelizes: Record<string, Sequelize> = {};

  constructor(connectionOption: string) {
    super(connectionOption);

    let sequelize;
    // since mariadb and mysql are fully compatible, let's use the same data
    // save the connection string
    this.connectionOption = connectionOption.replace('mariadb://', 'mysql://');

    sequelize = new Sequelize(connectionOption);
    this.dialect = this.getDialect(sequelize);

    if (connectionOption.includes('mariadb://')) {
      this.dialect = 'mariadb';
    }

    // save the root connection
    this.sequelizes[''] = sequelize;
  }

  private getDialect(sequelize: Sequelize) {
    const parsedConnectionType = sequelize?.getDialect();
    switch (parsedConnectionType) {
      case 'mysql':
      case 'mariadb':
      case 'mssql':
      case 'postgres':
      case 'sqlite':
        return parsedConnectionType;
      default:
        return undefined; // Not supported by relational database adapter
    }
  }

  private getConnection(database?: string): Sequelize {
    if (!database) {
      database = '';
    } else if (this.dialect === 'sqlite') {
      database = '';
    }

    if (!this.sequelizes[database]) {
      this.sequelizes[database] = new Sequelize(`${this.connectionOption}/${database}`, {
        logging: false,
        dialectOptions: {
          multipleStatements: true,
        },
      });
    }
    return this.sequelizes[database];
  }

  async authenticate() {
    return this.getConnection().authenticate();
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    let sql;

    switch (this.dialect) {
      case 'mssql':
        sql = `SELECT name AS 'database' FROM sys.databases`;
        break;
      case 'postgres':
        sql = `SELECT datname AS database FROM pg_database`;
        break;
      case 'sqlite':
        // because SQLITE doesn't have a concept of database
        // so we will hard code this as sqlite here
        // so that the ui will show up
        return [
          {
            name: 'Sqlite',
            tables: [], // TODO: will remove this entirely
          },
        ];
        break;
      case 'mariadb':
      case 'mysql':
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
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // https://github.com/knex/knex/issues/360
    // PostgreSQL: SELECT tablename FROM pg_tables WHERE schemaname='public''
    // MySQL: SELECT TABLE_SCHEMA FROM information_schema.tables GROUP BY TABLE_SCHEMA;
    // SQLite3: SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '%sqlite%';
    let sql;
    let data;

    switch (this.dialect) {
      case 'mssql':
        sql = `SELECT name AS 'tablename' FROM SYSOBJECTS WHERE xtype = 'U' ORDER BY tablename`;
        break;
      case 'postgres':
        sql = `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
        break;
      default:
      case 'sqlite':
        sql = `SELECT name AS tablename FROM sqlite_master WHERE type='table' AND name NOT LIKE '%sqlite%' ORDER BY tablename`;
        break;
      case 'mariadb':
      case 'mysql':
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
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    switch (this.dialect) {
      case 'mssql':
      case 'postgres':
      case 'sqlite':
      case 'mariadb':
      case 'mysql':
      default:
        const columns: SqluiCore.ColumnMetaData[] = [];
        try {
          const columnMap = await this.getConnection(database)
            .getQueryInterface()
            .describeTable(table);

          for (const columnName of Object.keys(columnMap)) {
            columns.push({
              name: columnName,
              ...columnMap[columnName],
            });
          }
        } catch (err) {}

        return columns.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    // https://sequelize.org/master/manual/raw-queries.html
    //@ts-ignore
    try {
      let [raw, meta] = await this.getConnection(database).query(sql, {
        raw: true,
      });

      let rawToUse: any | undefined = raw;
      let metaToUse: any | undefined = meta;
      let affectedRows;

      switch (this.dialect) {
        case 'mssql':
          affectedRows = metaToUse;
          break;
        case 'postgres':
          if (metaToUse.rowCount >= 0) {
            affectedRows = metaToUse.rowCount;
          }
          // Postgres returns a lot of redundant data, best to remove it to save space...
          metaToUse = undefined;
          break;
        case 'sqlite':
          if (metaToUse.changes >= 0) {
            affectedRows = metaToUse.changes;
          } else {
            metaToUse = undefined;
          }
          break;
        case 'mariadb':
        case 'mysql':
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
    }
  }

  private async _execute(
    sql: string,
    database?: string,
  ): Promise<[SqluiCore.RawData, SqluiCore.MetaData]> {
    // https://sequelize.org/master/manual/raw-queries.html
    //@ts-ignore
    return this.getConnection(database).query(sql, {
      raw: true,
    });
  }
}
