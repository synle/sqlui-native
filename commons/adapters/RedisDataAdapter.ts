import { createClient, RedisClientType } from 'redis';
import { SqluiCore } from '../../typings';
import IDataAdapter from './IDataAdapter';
import BaseDataAdapter from './BaseDataAdapter';

export default class RedisDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect: SqluiCore.Dialect = 'redis';
  client?: RedisClientType;

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  private async getConnection(): Promise<RedisClientType> {
    // attempt to pull in connections
    return new Promise<RedisClientType>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Redis connection Timeout'), 3000);

        if (!this.client) {
          const client = createClient({
            url: this.connectionOption,
          });

          await client.connect();

          //@ts-ignore
          this.client = client;
        }

        //@ts-ignore
        resolve(this.client);
      } catch (err) {
        reject(err);
      }
    });
  }

  async authenticate() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    return [
      {
        name: 'Redis Database',
        tables: [],
      },
    ];
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // TODO: this operation seems to work, but very slow
    // for now, we will just returned a hard coded value

    // const db = await this.getConnection();
    // const keys = await db.keys('*');
    // return keys.map((name) => ({ name, columns: [] }));

    return [
      {
        name: 'Redis Table',
        columns: [],
      },
    ];
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    return [];
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    const db = await this.getConnection();

    try {
      //@ts-ignore
      const resp: any = await eval(sql);
      console.log(resp);

      if (resp === 'OK') {
        return { ok: true };
      }

      if (typeof resp === 'number' || typeof resp === 'string') {
        //@ts-ignore
        return { ok: true, raw: [].concat({ value: resp }) };
      }

      if (Array.isArray(resp)) {
        //@ts-ignore
        return { ok: true, raw: [].concat(resp.map((item) => ({ item: JSON.stringify(item) }))) };
      }

      if (typeof resp === 'object') {
        return { ok: true, raw: [resp] };
      }

      return { ok: true, meta: resp };
    } catch (error: any) {
      console.log(error);
      return { ok: false, error: error.toString() };
    }
  }
}
