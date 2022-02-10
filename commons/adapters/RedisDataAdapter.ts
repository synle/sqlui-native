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
        name: 'Redis',
        tables: [],
      },
    ];
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    const db = await this.getConnection();
    const keys = await db.keys('*');
    return keys.map((name) => ({ name, columns: [] }));
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    return [];
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    const db = await this.getConnection();

    //@ts-ignore
    const rawToUse: any = await eval(sql);

    console.log(sql);
    console.log(rawToUse);

    return { ok: false };
  }
}
