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
    return new Promise(async (resolve, reject) => {
      try {
        const client = await this.getConnection();

        try {
          //@ts-ignore
          const collections = await client.db(database).listCollections().toArray();

          resolve(
            (collections || [])
              .map((collection) => ({
                name: collection.name,
                columns: [],
              }))
              .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
          );
        } finally {
          this.closeConnection(client);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const client = await this.getConnection();

        try {
          //@ts-ignore
          const items = await client
            .db(database)
            .collection(table)
            .find()
            .limit(MAX_ITEM_COUNT_TO_SCAN)
            .toArray();

          return resolve(BaseDataAdapter.inferTypesFromItems(items));
        } finally {
          this.closeConnection(client);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  private async createDatabase(newDatabase: string): Promise<void> {
    const connectionToUse = `${this.connectionOption}/${newDatabase}`;

    // TODO: check if this database name is there
    const databases = await this.getDatabases();

    for (const database of databases) {
      if (database.name === newDatabase) {
        throw 'Database already existed, cannot create this database';
      }
    }

    // connect to this client
    const client = await this.getConnection(connectionToUse);

    // create a dummy collection
    await client.db(newDatabase).createCollection('test-collection');
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!sql.includes(`${MONGO_ADAPTER_PREFIX}.`)) {
          throw `Invalid syntax. MongoDB syntax in sqlui-native starts with '${MONGO_ADAPTER_PREFIX}.'. Refer to the syntax help in this link https://synle.github.io/sqlui-native/guides#mongodb`;
        }

        if (
          (sql.includes('db.create(') || sql.includes('db.createDatabase(')) &&
          sql.includes(')')
        ) {
          // TODO: see if we need to be more strict with the regex
          let databaseName = sql
            .replace(/[;'" )]/g, '')
            .replace('db.create(', '')
            .replace('db.createDatabase(', '')
            .trim();
          await this.createDatabase(databaseName);
          return resolve({
            ok: true,
            meta: `Database ${databaseName} created`,
          });
        }

        const client = await this.getConnection();

        try {
          const db = await client.db(database);

          //@ts-ignore
          const rawToUse: any = await eval(sql);

          if (rawToUse.acknowledged === true) {
            // insert or insertOne
            let affectedRows =
              rawToUse.insertedCount || rawToUse.deletedCount || rawToUse.modifiedCount;
            if (affectedRows === undefined) {
              affectedRows = 1;
            }

            resolve({
              ok: false,
              meta: rawToUse,
              affectedRows,
            });
          } else if (Array.isArray(rawToUse)) {
            resolve({
              ok: false,
              raw: rawToUse,
            });
          } else {
            resolve({
              ok: false,
            });
          }
        } finally {
          this.closeConnection(client);
        }
      } catch (err) {
        resolve({
          ok: false,
          error: err,
        });
      }
    });
  }
}
