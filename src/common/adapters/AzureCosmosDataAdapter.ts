import { CosmosClient } from '@azure/cosmos';
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from 'src/common/adapters/BaseDataAdapter';
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

  static getParsedConnectionOptions(connectionOption: string): AzureCosmosDBConnectionOption {
    const parsedConnectionOption: Partial<AzureCosmosDBConnectionOption> = connectionOption
      .replace('cosmosdb://', '')
      .split(/;/gi)
      .reduce((res, s) => {
        const key = s.substr(0, s.indexOf('='));
        const value = s.substr(key.length + 1);

        res[key] = value;

        return res;
      }, {});

    if (!parsedConnectionOption.AccountEndpoint || !parsedConnectionOption.AccountKey) {
      throw `Missing AccountEndpoint or AccountKey. The proper connection string should be comsosdb://AccountEndpoint=<your_cosmos_uri>;AccountKey=<your_cosmos_primary_key>`;
    }

    return parsedConnectionOption as AzureCosmosDBConnectionOption;
  }

  private async getConnection(): Promise<AzureCosmosDBClient> {
    // attempt to pull in connections
    return new Promise<AzureCosmosDBClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('CosmosDB connection Timeout'), MAX_CONNECTION_TIMEOUT);

        const parsedConnectionOption = AzureCosmosDataAdapter.getParsedConnectionOptions(
          this.connectionOption,
        );

        const client = new CosmosClient({
          endpoint: parsedConnectionOption.AccountEndpoint,
          key: parsedConnectionOption.AccountKey,
        });

        resolve(client);
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
        setTimeout(() => reject('CosmosDB connection timeout'), MAX_CONNECTION_TIMEOUT);

        await this.getConnection();

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    // https://azure.github.io/azure-cosmos-js/classes/databases.html#readall
    const client = await this.getConnection();

    const { resources: databases } = await client.databases.readAll().fetchAll();

    return databases.map((db) => ({
      name: db.id,
      tables: [],
    }));
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // https://azure.github.io/azure-cosmos-js/classes/containers.html#readall
    if (!database) {
      throw 'Database is a required field for Azure CosmosDB';
    }

    const client = await this.getConnection();

    const { resources: tables } = await client.database(database).containers.readAll().fetchAll();

    return tables.map((table) => ({
      name: table.id,
      columns: [],
    }));
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    if (!database) {
      throw 'Database is a required field for Azure CosmosDB';
    }

    const client = await this.getConnection();

    const { resources: items } = await client
      .database(database)
      .container(table)
      .items.query({
        query: `SELECT * from c OFFSET 1 LIMIT ${MAX_ITEM_COUNT_TO_SCAN}`,
      })
      .fetchAll();

    return BaseDataAdapter.inferTypesFromItems(items);
  }

  async execute(sql: string, database?: string, table?: string): Promise<SqluiCore.Result> {
    try {
      if (!database) {
        throw 'Database is a required field for Azure CosmosDB';
      }

      const client = await this.getConnection();

      const db = await client.database(database);

      let items : any;

      if((sql.includes('db') || sql.includes('client')) && (sql.includes('.database') || sql.includes('.container'))){
        // run as raw query
        //@ts-ignore
        const res: any = await eval(sql);

        items = res.resource || res.resources;
      } else {
        // run as sql query
        if (!table) {
          throw 'Table is a required field for Azure CosmosDB in raw SQL mode';
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
      return { ok: false, error: JSON.stringify(error) };
    } finally {
      this.closeConnection();
    }
  }
}
