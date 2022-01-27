import { Sequelize, ColumnDescription } from 'sequelize';
import { Sqlui } from '../../typings';

/**
 * mostly adapter for sequelize
 * https://sequelize.org/master/class/lib/dialects/abstract/query-interface.js~QueryInterface.html
 */
export class RelationalDatabaseEngine {
  /**
   * // https://sequelize.org/v5/manual/dialects.html
   * @type {string}
   */
  private connectionOption?: string;
  public dialect?: Sqlui.Dialect;
  private sequelizes: Record<string, Sequelize> = {};

  constructor(connectionOption: string | Sequelize) {
    let sequelize;
    if (typeof connectionOption === 'string') {
      //since mariadb and mysql are fully compatible, let's use the same data
      connectionOption = (connectionOption as string).replace('mariadb://', 'mysql://');

      // save the connection string
      this.connectionOption = connectionOption;

      sequelize = new Sequelize(connectionOption);
    } else {
      sequelize = connectionOption as Sequelize;
    }

    this.dialect = sequelize?.getDialect();

    // save the root connection
    this.sequelizes[''] = sequelize;
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
      });
    }
    return this.sequelizes[database];
  }

  async authenticate() {
    return this.getConnection().authenticate();
  }

  async getDatabases(): Promise<string[]> {
    let sql;

    switch (this.dialect) {
      case 'mssql':
        sql = `SELECT name AS 'database' FROM sys.databases`;
        break;
      case 'postgres':
        sql = `SELECT datname AS database FROM pg_database`;
        break;
      case 'sqlite':
        break;
      case 'mariadb':
      case 'mysql':
        sql = `show databases`;
        break;
    }

    if (!sql) {
      return [];
    }

    const [data] = await this.execute(sql);

    return data
      .map(
        (row: any) =>
          row.Database || // mssql and mysql
          row.database, // postgres
      )
      .filter((db) => db)
      .sort();
  }

  async getTables(database?: string): Promise<string[]> {
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

    [data] = await this.execute(sql, database);

    return data
      .map((row: any) => row.tablename)
      .filter((db) => db)
      .sort();
  }

  async getColumns(table: string, database?: string): Promise<Record<string, ColumnDescription>> {
    switch (this.dialect) {
      case 'mssql':
      case 'postgres':
      case 'sqlite':
      case 'mariadb':
      case 'mysql':
      default:
        return this.getConnection(database).getQueryInterface().describeTable(table);
    }
  }

  async execute(sql: string, database?: string): Promise<[Sqlui.RawData, Sqlui.MetaData]> {
    // https://sequelize.org/master/manual/raw-queries.html
    //@ts-ignore
    return this.getConnection(database).query(sql, {
      raw: true,
    });
  }
}

const engines: { [index: string]: RelationalDatabaseEngine } = {};
export function getEngine(connection: string) {
  if (engines[connection]) {
    return engines[connection];
  }
  const engine = new RelationalDatabaseEngine(connection);
  engines[connection] = engine;
  return engine;
}

export async function getConnectionMetaData(connection: Sqlui.CoreConnectionProps) {
  const connItem: Sqlui.CoreConnectionMetaData = {
    name: connection.name,
    id: connection?.id,
    connection: connection.connection,
    databases: [] as Sqlui.DatabaseMetaData[],
  };

  try {
    const engine = getEngine(connection.connection);
    const databases = await engine.getDatabases();

    connItem.status = 'online';
    connItem.dialect = engine.dialect;

    for (const database of databases) {
      const dbItem: Sqlui.DatabaseMetaData = {
        name: database,
        tables: [] as Sqlui.TableMetaData[],
      };

      // @ts-ignore
      connItem.databases.push(dbItem);

      let tables: string[] = [];
      try {
        tables = await engine.getTables(database);
        //console.log('getting tables', database, tables);
      } catch (err) {
        //console.log('failed getting tables', database);
      }

      for (const table of tables) {
        let columns: Sqlui.ColumnMetaData | undefined = undefined;

        try {
          columns = await engine.getColumns(table, database);
        } catch (err) {
          //console.log('failed getting columns', database, table);
        }

        const tblItem: Sqlui.TableMetaData = {
          name: table,
          columns,
        };

        // @ts-ignore
        dbItem.tables.push(tblItem);
      }
    }
  } catch (err) {
    // console.log('connection error', connection.name, err);
    connItem.status = 'offline';
    connItem.dialect = undefined;
  }

  return connItem;
}
