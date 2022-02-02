import { SqluiCore } from '../../typings';
import CoreDataAdapter from './CoreDataAdapter';

export default class CassandraAdapter implements CoreDataAdapter {
  connectionOption?: string;
  dialect: SqluiCore.Dialect = 'cassandra';

  constructor(connectionOption: string) {
    this.connectionOption = connectionOption as string;
  }

  async authenticate() {
    // TODO: To Be Implemented
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    // TODO: To Be Implemented
    return [];
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // TODO: To Be Implemented
    return [];
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    // TODO: To Be Implemented
    return [];
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    // TODO: To Be Implemented
    return {
      ok: false,
      error: 'To Be Implemented',
    };
  }
}
