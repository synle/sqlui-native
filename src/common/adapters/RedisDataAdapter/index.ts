import { createClient, RedisClientType } from "redis";
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { getClientOptions } from "src/common/adapters/RedisDataAdapter/utils";
import { SqluiCore } from "typings";

/** Prefix used for Redis query syntax in sqlui-native. */
const REDIS_ADAPTER_PREFIX = "db";

/** Data adapter for Redis and Redis with SSL (rediss) connections. */
export default class RedisDataAdapter extends BaseDataAdapter implements IDataAdapter {
  private _connection?: RedisClientType;

  private async getConnection(): Promise<RedisClientType> {
    // attempt to pull in connections
    return new Promise<RedisClientType>(async (resolve, reject) => {
      try {
        setTimeout(() => reject("Connection Timeout"), MAX_CONNECTION_TIMEOUT);

        const client = createClient(getClientOptions(this.connectionOption));

        client.connect();

        client.on("ready", () => {
          //@ts-ignore
          this._connection = client;
          //@ts-ignore
          resolve(client);
        });

        client.on("error", (err) => reject(err));
      } catch (err) {
        console.error("RedisDataAdapter:getConnection", err);
        reject(err);
      }
    });
  }

  /** Disconnects the Redis client held by this adapter. */
  async disconnect() {
    try {
      await this._connection?.disconnect();
    } catch (err) {
      console.error("RedisDataAdapter:disconnect", err);
    }
    this._connection = undefined;
  }

  /** Authenticates by establishing a Redis connection. */
  async authenticate() {
    await this.getConnection();
  }

  /**
   * Returns a single hard-coded database entry for Redis.
   * @returns Array with one database metadata object.
   */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    return [
      {
        name: "Redis Database",
        tables: [],
      },
    ];
  }

  /**
   * Returns a single hard-coded table entry for Redis.
   * @returns Array with one table metadata object.
   */
  async getTables(): Promise<SqluiCore.TableMetaData[]> {
    // TODO: this operation seems to work, but very slow
    // for now, we will just returned a hard coded value

    return [
      {
        name: "Redis Table",
        columns: [],
      },
    ];
  }

  /**
   * Returns an empty array since Redis is a key-value store without column schemas.
   * @returns Empty array.
   */
  async getColumns(): Promise<SqluiCore.ColumnMetaData[]> {
    return [];
  }

  /**
   * Executes a Redis command string using eval-based syntax.
   * @param sql - The Redis command string (e.g., `db.get("key")`).
   * @returns The command result with data or error information.
   */
  async execute(sql: string): Promise<SqluiCore.Result> {
    try {
      if (!sql.includes(`${REDIS_ADAPTER_PREFIX}.`)) {
        throw new Error(
          `Invalid syntax. Redis syntax in sqlui-native starts with '${REDIS_ADAPTER_PREFIX}.'. Refer to the syntax help in this link https://synle.github.io/sqlui-native/guides#redis`,
        );
      }

      const db = await this.getConnection(); // eslint-disable-line @typescript-eslint/no-unused-vars

      //@ts-ignore
      const resp: any = await eval(sql); // eslint-disable-line no-eval
      console.error("RedisDataAdapter:execute", resp);

      if (resp === "OK") {
        return { ok: true };
      }

      if (typeof resp === "number" || typeof resp === "string") {
        //@ts-ignore
        return { ok: true, raw: [].concat({ value: resp }) };
      }

      if (Array.isArray(resp)) {
        //@ts-ignore
        return { ok: true, raw: [].concat(resp.map((item) => ({ item: JSON.stringify(item) }))) };
      }

      if (typeof resp === "object") {
        return { ok: true, raw: [resp] };
      }

      return { ok: true, meta: resp };
    } catch (error: any) {
      console.error("RedisDataAdapter:execute", error);
      return { ok: false, error: error.toString() };
    }
  }
}
