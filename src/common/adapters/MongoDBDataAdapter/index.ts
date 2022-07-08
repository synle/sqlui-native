import { MongoClient } from 'mongodb';
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from 'src/common/adapters/BaseDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';

const MONGO_ADAPTER_PREFIX = 'db';

/**
 * @type {Number} maximum number of items to scan for column metadata
 */
const MAX_ITEM_COUNT_TO_SCAN = 5;

export default class MongoDBDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect: SqluiCore.Dialect = 'mongodb';

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  private async getConnection(connectionToUse?: string): Promise<MongoClient> {
    // attempt to pull in connections
    return new Promise<MongoClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Connection Timeout'), MAX_CONNECTION_TIMEOUT);

        const client = new MongoClient(connectionToUse || this.connectionOption);
        await client.connect();
        resolve(client);
      } catch (err) {
        reject(err);
      }
    });
  }

  private async closeConnection(client?: MongoClient) {
    try {
      await client?.close();
    } catch (err) {}
  }

  async authenticate() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Connection Timeout'), MAX_CONNECTION_TIMEOUT);

        const client = new MongoClient(this.connectionOption);
        await client.connect();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const client = await this.getConnection();

    try {
      //@ts-ignore
      const res = await client.db().admin().listDatabases();
      return res.databases
        .map((database: any) => ({
          name: database.name,
          tables: [],
        }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } finally {
      this.closeConnection(client);
    }
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    const client = await this.getConnection();

    try {
      //@ts-ignore
      const collections = await client.db(database).listCollections().toArray();

      return (collections || [])
        .map((collection) => ({
          name: collection.name,
          columns: [],
        }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } finally {
      this.closeConnection(client);
    }
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    const client = await this.getConnection();

    try {
      //@ts-ignore
      const items = await client
        .db(database)
        .collection(table)
        .find()
        .limit(MAX_ITEM_COUNT_TO_SCAN)
        .toArray();

      return BaseDataAdapter.inferTypesFromItems(JSON.parse(JSON.stringify(items))).map(
        (column) => ({
          ...column,
          primaryKey: column.name === '_id',
        }),
      );
    } finally {
      this.closeConnection(client);
    }
  }

  private async createDatabase(newDatabase: string): Promise<void> {
    const connectionToUse = `${this.connectionOption}/${newDatabase}`;

    // connect to this client
    const client = await this.getConnection(connectionToUse);

    try {
      // TODO: check if this database name is there
      const databases = await this.getDatabases();

      for (const database of databases) {
        if (database.name === newDatabase) {
          throw 'Database already existed, cannot create this database';
        }
      }

      // create a dummy collection
      await client.db(newDatabase).createCollection('test-collection');
    } finally {
      this.closeConnection(client);
    }
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    const client = await this.getConnection();

    try {
      if (!sql.includes(`${MONGO_ADAPTER_PREFIX}.`)) {
        throw `Invalid syntax. MongoDB syntax in sqlui-native starts with '${MONGO_ADAPTER_PREFIX}.'. Refer to the syntax help in this link https://synle.github.io/sqlui-native/guides#mongodb`;
      }

      if ((sql.includes('db.create(') || sql.includes('db.createDatabase(')) && sql.includes(')')) {
        // TODO: see if we need to be more strict with the regex
        let databaseName = sql
          .replace(/[;'" )]/g, '')
          .replace('db.create(', '')
          .replace('db.createDatabase(', '')
          .trim();
        await this.createDatabase(databaseName);
        return {
          ok: true,
          meta: `Database ${databaseName} created`,
        };
      }

      const db = await client.db(database);

      const { ObjectId } = require('mongodb');

      //@ts-ignore
      const rawToUse: any = await eval(sql);

      if (rawToUse?.acknowledged === true) {
        // insert or insertOne
        let affectedRows =
          rawToUse.insertedCount || rawToUse.deletedCount || rawToUse.modifiedCount;
        if (affectedRows === undefined) {
          affectedRows = 1;
        }

        return {
          ok: true,
          meta: rawToUse,
          affectedRows,
        };
      } else if (Array.isArray(rawToUse)) {
        return {
          ok: true,
          raw: rawToUse,
        };
      } else {
        return {
          ok: true,
          raw: rawToUse,
        };
      }
    } catch (err: any) {
      console.log('Execute Error', err);
      return {
        ok: false,
        error: err?.toString() || JSON.stringify(err),
      };
    } finally {
      this.closeConnection(client);
    }
  }
}
