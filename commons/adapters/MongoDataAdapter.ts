// mongodb://localhost:27017
import MongoDB from 'mongodb';
import { SqluiCore } from '../../typings';
import IDataAdapter from './IDataAdapter';
import BaseDataAdapter from './BaseDataAdapter';

export default class MongoDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect: SqluiCore.Dialect = 'mongodb';

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  async authenticate() {
    // TODO: To Be Implemented
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    return [];
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    return [];
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    return [];
  }

  private async _execute(sql: string, params?: string[], database?: string) {}

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {}
}
