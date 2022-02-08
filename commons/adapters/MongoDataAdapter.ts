// mongodb://localhost:27017
import { MongoClient } from 'mongodb';
import { SqluiCore } from '../../typings';
import IDataAdapter from './IDataAdapter';
import BaseDataAdapter from './BaseDataAdapter';

export default class MongoDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect: SqluiCore.Dialect = 'mongodb';

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  private async getConnection(database?: string): Promise<MongoClient> {
    // attempt to pull in connections
    return new Promise<MongoClient>(async (resolve, reject) => {
      try {
        console.log('connecting', this.connectionOption)
        const client = new MongoClient(this.connectionOption);
        // await client.connect();
        // console.log('connected', client)

        resolve(client);
      } catch (err) {
        reject(err);
      }
    });
  }

  async authenticate() {
    // TODO: To Be Implemented
    return new Promise<void>(async (resolve, reject) => {
      console.log('connecting', this.connectionOption)
      const client = new MongoClient(this.connectionOption);
      // await client.connect();
      // console.log('connected', client)
      resolve();
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const client = await this.getConnection();
    return [];
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    return [];
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    return [];
  }

  private async _execute(sql: string, params?: string[], database?: string) {}

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    return Promise.resolve({ok: false});
  }
}
