import { SqluiCore } from '../../typings';

export default interface CoreDataAdapter {
  connectionOption?: string;
  dialect?: SqluiCore.Dialect;
  authenticate: () => void;
  getDatabases: () => Promise<SqluiCore.DatabaseMetaData[]>;
  getTables: (database?: string) => Promise<SqluiCore.TableMetaData[]>;
  getColumns: (table: string, database?: string) => Promise<SqluiCore.ColumnMetaData[]>;
  execute: (sql: string, database?: string) => Promise<SqluiCore.Result>;
}
