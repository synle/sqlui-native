import { RedisClientType, createClient } from 'redis';
import { SqluiCore } from '../../../typings';
import IDataAdapter from './IDataAdapter';
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from './BaseDataAdapter';

const REDIS_ADAPTER_PREFIX = 'db';

export default class RedisDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect: SqluiCore.Dialect = 'redis';

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  private async getConnection(): Promise<RedisClientType> {
    // attempt to pull in connections
    return new Promise<RedisClientType>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Redis connection Timeout'), MAX_CONNECTION_TIMEOUT);

        const client = createClient({
          url: this.connectionOption,
        });

        client.connect();

        client.on('ready', () =>
          //@ts-ignore
          resolve(client),
        );

        client.on('error', (err) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }

  private async closeConnection(client?: RedisClientType) {
    try {
      await client?.disconnect();
    } catch (err) {}
  }

  async authenticate() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Redis connection Timeout'), MAX_CONNECTION_TIMEOUT);

        const client = createClient({
          url: this.connectionOption,
        });

        client.connect();

        client.on('ready', () =>
          //@ts-ignore
          resolve(),
        );

        client.on('error', (err) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    await this.getConnection();

    return [
      {
        name: 'Redis Database',
        tables: [],
      },
    ];
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    await this.getConnection();

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
    let db: RedisClientType | undefined;

    try {
      if (!sql.includes(`${REDIS_ADAPTER_PREFIX}.`)) {
        throw `Invalid syntax. Redis syntax in sqlui-native starts with '${REDIS_ADAPTER_PREFIX}.'. Refer to the syntax help in this link https://synle.github.io/sqlui-native/guides#redis`;
      }

      db = await this.getConnection();

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
    } finally {
      this.closeConnection(db);
    }
  }
}
