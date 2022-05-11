import { SqluiCore } from 'typings';

export default interface IDataAdapter {
  dialect?: SqluiCore.Dialect;
  authenticate: () => Promise<void>;
  getDatabases: () => Promise<SqluiCore.DatabaseMetaData[]>;
  getTables: (database: string | undefined) => Promise<SqluiCore.TableMetaData[]>;
  getColumns: (table: string, database: string | undefined) => Promise<SqluiCore.ColumnMetaData[]>;
  execute: (sql: string, database: string | undefined, table: string | undefined) => Promise<SqluiCore.Result>;
}
