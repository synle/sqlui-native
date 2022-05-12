import { CosmosClient } from '@azure/cosmos';
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from 'src/common/adapters/BaseDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';

type AzureCosmosDBClient = CosmosClient;

type AzureCosmosDBConnectionOption = {
  AccountEndpoint: string;
  AccountKey: string;
};

/**
 * @type {Number} maximum number of items to scan for column metadata
 */
const MAX_ITEM_COUNT_TO_SCAN = 5;

export default class AzureCosmosDataAdapter extends BaseDataAdapter implements IDataAdapter {
  // https://docs.microsoft.com/en-us/azure/cosmos-db/sql/sql-api-nodejs-get-started?tabs=windows
  dialect: SqluiCore.Dialect = 'cosmosdb';

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  private async getConnection(): Promise<AzureCosmosDBClient> {
    // attempt to pull in connections
    return new Promise<AzureCosmosDBClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Connection Timeout'), MAX_CONNECTION_TIMEOUT);

        const client = new CosmosClient(this.getConnectionString());

        resolve(client);
      } catch (err) {
        reject(err);
      }
    });
  }

  private async closeConnection(client?: any) {
    try {
      const client = await this.getConnection();
      await client.dispose();
    } catch (err) {}
  }

  async authenticate() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Connection timeout'), MAX_CONNECTION_TIMEOUT);

        await this.getDatabases();

        const client = await this.getConnection();
        const readEndpoint = await client.getReadEndpoint();

        if (readEndpoint) {
          resolve();
        } else {
          throw 'Failed to connect to Azure CosmosDB - Empty read endpoint';
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    // https://azure.github.io/azure-cosmos-js/classes/databases.html#readall
    try {
      const client = await this.getConnection();

      const { resources: databases } = await client.databases.readAll().fetchAll();

      return databases.map((db) => ({
        name: db.id,
        tables: [],
      }));
    } catch (err) {
      return [];
    } finally {
      this.closeConnection();
    }
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // https://azure.github.io/azure-cosmos-js/classes/containers.html#readall
    if (!database) {
      throw 'Database is a required field for Azure CosmosDB';
    }

    try {
      const client = await this.getConnection();

      const { resources: tables } = await client.database(database).containers.readAll().fetchAll();

      return tables.map((table) => ({
        name: table.id,
        columns: [],
      }));
    } catch (err) {
      return [];
    } finally {
      this.closeConnection();
    }
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    if (!database) {
      throw 'Database is a required field for Azure CosmosDB';
    }

    try {
      const client = await this.getConnection();

      const { resources: items } = await client
        .database(database)
        .container(table)
        .items.query({
          query: `SELECT * from c OFFSET 1 LIMIT ${MAX_ITEM_COUNT_TO_SCAN}`,
        })
        .fetchAll();

      return BaseDataAdapter.inferTypesFromItems(items);
    } catch (err) {
      return [];
    } finally {
      this.closeConnection();
    }
  }

  async execute(sql: string, database?: string, table?: string): Promise<SqluiCore.Result> {
    try {
      const client = await this.getConnection();

      let items: any;

      if (
        (sql.includes('db') || sql.includes('client')) &&
        (sql.includes('.database') || sql.includes('.container'))
      ) {
        // run as raw query
        //@ts-ignore
        const res: any = await eval(sql);

        items = res.item || res.resource || res.resources;
      } else {
        // run as sql query
        if (!table) {
          throw 'Table is a required field for Azure CosmosDB in raw SQL mode';
        }

        if (!database) {
          throw 'Database is a required field for Azure CosmosDB in raw SQL mode';
        }

        const res = await client
          .database(database)
          .container(table)
          .items.query({
            query: sql,
          })
          .fetchAll();
        items = res.resources;
      }

      return { ok: true, raw: items };
    } catch (error: any) {
      console.log(error);
      return { ok: false, error: JSON.stringify(error, null, 2) };
    } finally {
      this.closeConnection();
    }
  }
}
