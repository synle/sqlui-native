import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from 'src/common/adapters/BaseDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';
// TODO: implement me
type YOUR_ADAPTER_CLIENT = any;

export default class YOUR_ADAPTER_NAME extends BaseDataAdapter implements IDataAdapter {
  constructor(connectionOption: string) {
    super(connectionOption);
  }

  private async getConnection(): Promise<YOUR_ADAPTER_CLIENT> {
    // attempt to pull in connections
    return new Promise<YOUR_ADAPTER_CLIENT>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Connection timeout'), MAX_CONNECTION_TIMEOUT);

        // TODO: implement me
        resolve({});
      } catch (err) {
        reject(err);
      }
    });
  }

  private async closeConnection(client?: any) {
    try {
      // TODO: implement me
    } catch (err) {}
  }

  async authenticate() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Connection timeout'), MAX_CONNECTION_TIMEOUT);

        // TODO: implement me
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    // TODO: implement me
    return [
      {
        name: 'TODO Database1',
        tables: [],
      },
    ];
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // TODO: implement me
    return [
      {
        name: 'TODO Table2',
        columns: [],
      },
    ];
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    // TODO: implement me
    return [];
  }

  async execute(sql: string, database?: string, table?: string): Promise<SqluiCore.Result> {
    try {
      if (!database) {
        throw 'Database is a required field';
      }

      let raw = [];

      return { ok: true, raw };
    } catch (error: any) {
      console.log(error);
      return { ok: false, error: JSON.stringify(error, null, 2) };
    } finally {
      this.closeConnection();
    }
  }
}
