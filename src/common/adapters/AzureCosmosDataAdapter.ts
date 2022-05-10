import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from 'src/common/adapters/BaseDataAdapter';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';
import {CosmosClient} from '@azure/cosmos';

type AzureCosmosDBClient = CosmosClient;

type AzureCosmosDBConnectionOption = {
  AccountEndpoint: string,
  AccountKey:  string,
}

export default class AzureCosmosDataAdapter extends BaseDataAdapter implements IDataAdapter {
  // https://docs.microsoft.com/en-us/azure/cosmos-db/sql/sql-api-nodejs-get-started?tabs=windows
  dialect: SqluiCore.Dialect = 'cosmosdb';

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  static getParsedConnectionOptions(connectionOption: string): AzureCosmosDBConnectionOption{
    const parsedConnectionOption : Partial<AzureCosmosDBConnectionOption> = connectionOption.replace('cosmosdb://', '').split(/;/gi).reduce((res, s) => {
      const key = s.substr(0, s.indexOf('='));
      const value = s.substr(key.length + 1);

      res[key] = value;

      return res;
    }, {});

    if(!parsedConnectionOption.AccountEndpoint || !parsedConnectionOption.AccountKey){
      throw `Missing AccountEndpoint or AccountKey. The proper connection string should be comsosdb://AccountEndpoint=<your_cosmos_uri>;AccountKey=<your_cosmos_primary_key>`
    }

    return parsedConnectionOption as AzureCosmosDBConnectionOption;
  }

  private async getConnection(): Promise<AzureCosmosDBClient> {
    // attempt to pull in connections
    return new Promise<AzureCosmosDBClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('CosmosDB connection Timeout'), MAX_CONNECTION_TIMEOUT);

        const parsedConnectionOption = AzureCosmosDataAdapter.getParsedConnectionOptions(this.connectionOption);

        const client = new CosmosClient({
          endpoint: parsedConnectionOption.AccountEndpoint,
          key: parsedConnectionOption.AccountKey
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

        resolve()
      } catch (err) {
        reject(err);
      }
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    // https://azure.github.io/azure-cosmos-js/classes/databases.html#readall
    const client = await this.getConnection();

    const res = await client.databases.readAll().fetchAll();

    return res.resources.map(db => ({
      name: db.id,
      tables: [],
    }));
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // TODO: implement me
    // await this.getConnection();

    return [
      {
        name: 'CosmosDB Table',
        columns: [],
      },
    ];
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    // TODO: implement me
    return [];
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    try {
      // TODO: implement me
      return { ok: true };
    } catch (error: any) {
      console.log(error);
      return { ok: false, error: error.toString() };
    } finally {
      this.closeConnection();
    }
  }
}
