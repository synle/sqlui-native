import { MongoClient } from "mongodb";
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/** Prefix used for MongoDB query syntax in sqlui-native. */
const MONGO_ADAPTER_PREFIX = "db";

/**
 * @type {Number} maximum number of items to scan for column metadata
 */
const MAX_ITEM_COUNT_TO_SCAN = 10;

/** Data adapter for MongoDB and MongoDB+SRV connections. */
export default class MongoDBDataAdapter extends BaseDataAdapter implements IDataAdapter {
  private _connection?: MongoClient;

  private async getConnection(connectionToUse?: string): Promise<MongoClient> {
    // attempt to pull in connections
    return new Promise<MongoClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject("Connection Timeout"), MAX_CONNECTION_TIMEOUT);

        const client = new MongoClient(connectionToUse || this.connectionOption);
        await client.connect();
        this._connection = client;
        resolve(client);
      } catch (err) {
        console.error("MongoDBDataAdapter:getConnection", err);
        reject(err);
      }
    });
  }

  /** Closes the MongoDB connection held by this adapter. */
  async disconnect() {
    try {
      await this._connection?.close();
    } catch (err) {
      console.error("MongoDBDataAdapter:disconnect", err);
    }
    this._connection = undefined;
  }

  /** Authenticates by establishing a MongoDB connection. */
  async authenticate() {
    await this.getConnection();
  }

  /** Retrieves all database names from the MongoDB server.
   * @returns Array of database metadata objects.
   */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const client = await this.getConnection();

    //@ts-ignore
    const res = await client.db().admin().listDatabases();
    return res.databases.map((database: any) => ({
      name: database.name,
      tables: [],
    }));
  }

  /**
   * Retrieves all collections in the specified database.
   * @param database - The database name to list collections from.
   * @returns Array of table (collection) metadata objects.
   */
  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    const client = await this.getConnection();

    //@ts-ignore
    const collections = await client.db(database).listCollections().toArray();

    return (collections || []).map((collection) => ({
      name: collection.name,
      columns: [],
    }));
  }

  /**
   * Infers column metadata by scanning sample documents from a collection.
   * @param table - The collection name to scan.
   * @param database - The database containing the collection.
   * @returns Array of inferred column metadata objects.
   */
  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    const client = await this.getConnection();

    //@ts-ignore
    const items = await client.db(database).collection(table).find().limit(MAX_ITEM_COUNT_TO_SCAN).toArray();

    return BaseDataAdapter.inferTypesFromItems(structuredClone(items)).map((column) => ({
      ...column,
      primaryKey: column.name === "_id",
    }));
  }

  private async createDatabase(newDatabase: string): Promise<void> {
    const connectionToUse = `${this.connectionOption}/${newDatabase}`;

    // connect to this client
    const client = await this.getConnection(connectionToUse);

    const databases = await this.getDatabases();

    for (const database of databases) {
      if (database.name === newDatabase) {
        throw new Error("Database already existed, cannot create this database");
      }
    }

    // create a dummy collection
    await client.db(newDatabase).createCollection("test-collection");
  }

  /**
   * Executes a MongoDB query string using eval-based syntax.
   * @param sql - The MongoDB query string (e.g., `db.collection('x').find()`).
   * @param database - The database to execute against.
   * @returns The query result with data or error information.
   */
  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    const client = await this.getConnection();

    try {
      if (!sql.includes(`${MONGO_ADAPTER_PREFIX}.`)) {
        throw new Error(
          `Invalid syntax. MongoDB syntax in sqlui-native starts with '${MONGO_ADAPTER_PREFIX}.'. Refer to the syntax help in this link https://synle.github.io/sqlui-native/guides#mongodb`,
        );
      }

      const createDbMatch = sql.match(/db\.(?:create|createDatabase)\(\s*['"]([^'"]+)['"]\s*\)/);
      if (createDbMatch) {
        const databaseName = createDbMatch[1].trim();
        await this.createDatabase(databaseName);
        return {
          ok: true,
          meta: `Database ${databaseName} created`,
        };
      }

      const db = await client.db(database); // eslint-disable-line @typescript-eslint/no-unused-vars

      //@ts-ignore
      const rawToUse: any = await eval(sql); // eslint-disable-line no-eval

      if (rawToUse?.acknowledged === true) {
        // insert or insertOne
        let affectedRows = rawToUse.insertedCount || rawToUse.deletedCount || rawToUse.modifiedCount;
        if (affectedRows === undefined) {
          affectedRows = 1;
        }

        return {
          ok: true,
          meta: rawToUse,
          affectedRows,
        };
      } else if (Array.isArray(rawToUse) || (typeof rawToUse === "object" && rawToUse._id)) {
        return {
          ok: true,
          raw: [].concat(rawToUse),
        };
      } else {
        return {
          ok: true,
          meta: rawToUse,
        };
      }
    } catch (err: any) {
      console.error("MongoDBDataAdapter:execute", err);
      return {
        ok: false,
        error: err?.toString() || JSON.stringify(err),
      };
    }
  }
}
