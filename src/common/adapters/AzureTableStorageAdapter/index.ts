import { AzureNamedKeyCredential, TableServiceClient, TableClient } from '@azure/data-tables';
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from 'src/common/adapters/BaseDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';

type AzureTableConnectionOption = {
  DefaultEndpointsProtocol: string;
  AccountName: string;
  AccountKey: string;
  EndpointSuffix: string;
};

export default class AzureTableStorageAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect: SqluiCore.Dialect = 'aztable';

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  static getParsedConnectionOptions(connectionOption: string): AzureTableConnectionOption {
    const parsedConnectionOption: Partial<AzureTableConnectionOption> = connectionOption
      .replace('aztable://', '')
      .split(/;/gi)
      .reduce((res, s) => {
        const key = s.substr(0, s.indexOf('='));
        const value = s.substr(key.length + 1);

        res[key] = value;

        return res;
      }, {});

    if (
      !parsedConnectionOption.AccountKey ||
      !parsedConnectionOption.AccountName ||
      !parsedConnectionOption.EndpointSuffix
    ) {
      throw `Missing AccountName or AccountKey or EndpointSuffix. The proper connection string should be aztable://AccountEndpoint=<your_cosmos_uri>;AccountKey=<your_cosmos_primary_key>`;
    }

    parsedConnectionOption.DefaultEndpointsProtocol =
      parsedConnectionOption.DefaultEndpointsProtocol || 'https';

    return parsedConnectionOption as AzureTableConnectionOption;
  }

  private async getConnection() {
    // attempt to pull in connections
    return new Promise<TableServiceClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Connection timeout'), MAX_CONNECTION_TIMEOUT);

        const parsedConnectionOption = AzureTableStorageAdapter.getParsedConnectionOptions(
          this.connectionOption,
        );

        let azureTableClient : TableServiceClient;

        const endpoint = `${parsedConnectionOption.DefaultEndpointsProtocol}://${parsedConnectionOption.AccountName}.table.${parsedConnectionOption.EndpointSuffix}`
        const cred = new AzureNamedKeyCredential(
          parsedConnectionOption.AccountName,
          parsedConnectionOption.AccountKey,
        );


        resolve(new TableServiceClient(
            endpoint,
            cred,
          ));
      } catch (err) {
        reject(err);
      }
    });
  }

  private async getTableClient(table: string) {
    // attempt to pull in connections
    return new Promise<TableClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Connection timeout'), MAX_CONNECTION_TIMEOUT);

        const parsedConnectionOption = AzureTableStorageAdapter.getParsedConnectionOptions(
          this.connectionOption,
        );

        const endpoint = `${parsedConnectionOption.DefaultEndpointsProtocol}://${parsedConnectionOption.AccountName}.table.${parsedConnectionOption.EndpointSuffix}`
        const cred = new AzureNamedKeyCredential(
          parsedConnectionOption.AccountName,
          parsedConnectionOption.AccountKey,
        );

        resolve(new TableClient(
          endpoint,
          table,
          cred,
        ));
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
        setTimeout(() => reject('Connection timeout'), MAX_CONNECTION_TIMEOUT);

        await this.getConnection();

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    return [
      {
        name: 'Azure Table Storage',
        tables: [],
      },
    ];
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // https://docs.microsoft.com/en-us/javascript/api/overview/azure/data-tables-readme?view=azure-node-latest#list-tables-in-the-account
    const client = await this.getConnection();

    const tablesResponse = await client.listTables();

    const tables: SqluiCore.TableMetaData[] = [];
    for await (const table of tablesResponse) {
      if (table.name) {
        tables.push({
          name: table.name,
          columns: [],
        });
      }
    }

    return tables;
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    // TODO: implement me
    return [];
  }

  async execute(sql: string, database?: string, table?: string): Promise<SqluiCore.Result> {
    try {
      if(!table){
        throw `table is required to execute a azure table`;
      }
      const client = await this.getTableClient(table);

      let entitiesIter = client.listEntities();
      let i = 1;
      for await (const entity of entitiesIter) {
        console.log(`Entity${i}: PartitionKey: ${entity.partitionKey} RowKey: ${entity.rowKey}`);
        i++;
        // Output:
        // Entity1: PartitionKey: P1 RowKey: R1
        // Entity2: PartitionKey: P2 RowKey: R2
        // Entity3: PartitionKey: P3 RowKey: R3
        // Entity4: PartitionKey: P4 RowKey: R4
      }


      let raw = [];

      return { ok: true, raw };
    } catch (error: any) {
      console.log(error);
      return { ok: false, error: JSON.stringify(error) };
    } finally {
      this.closeConnection();
    }
  }
}
