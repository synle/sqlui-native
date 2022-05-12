import { AzureNamedKeyCredential, TableClient, TableServiceClient } from '@azure/data-tables';
import { getSampleConnectionString } from 'src/common/adapters/AzureTableStorageAdapter/scripts';
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from 'src/common/adapters/BaseDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';

type AzureTableConnectionOption = {
  DefaultEndpointsProtocol: string;
  EndpointSuffix: string;
  /**
   * @type {string} for account and key auth
   */
  AccountName?: string;
  /**
   * @type {string} for account and key auth
   */
  AccountKey?: string;
};

/**
 * @type {Number} maximum number of items to scan for column metadata
 */
const MAX_ITEM_COUNT_TO_SCAN = 5;

export default class AzureTableStorageAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect: SqluiCore.Dialect = 'aztable';

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  static getAuth(parsedConnectionOption: AzureTableConnectionOption): AzureNamedKeyCredential {
    // https://docs.microsoft.com/en-us/javascript/api/overview/azure/data-tables-readme?view=azure-node-latest#create-the-table-service-client
    // TODO support SAS Token
    if (parsedConnectionOption) {
      if (parsedConnectionOption.AccountKey && parsedConnectionOption.AccountName) {
        return new AzureNamedKeyCredential(
          parsedConnectionOption.AccountName,
          parsedConnectionOption.AccountKey,
        );
      }
    }

    throw `Missing AccountName / AccountKey. The proper connection string should be ${getSampleConnectionString()}`;
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

    parsedConnectionOption.DefaultEndpointsProtocol =
      parsedConnectionOption.DefaultEndpointsProtocol || 'https';

    return parsedConnectionOption as AzureTableConnectionOption;
  }

  /**
   * TableServiceClient - Client that provides functions to interact at a Table Service level such as create, list and delete tables
   */
  private async getTableServiceClient() {
    // attempt to pull in connections
    return new Promise<TableServiceClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Connection timeout'), MAX_CONNECTION_TIMEOUT);

        const parsedConnectionOption = AzureTableStorageAdapter.getParsedConnectionOptions(
          this.connectionOption,
        );

        const endpoint = `${parsedConnectionOption.DefaultEndpointsProtocol}://${parsedConnectionOption.AccountName}.table.${parsedConnectionOption.EndpointSuffix}`;
        const cred = AzureTableStorageAdapter.getAuth(parsedConnectionOption);
        resolve(new TableServiceClient(endpoint, cred));
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * TableServiceClient - Client that provides functions to interact at a Table Service level such as create, list and delete tables
   * @param {string} table [description]
   */
  private async getTableClient(table?: string) {
    // attempt to pull in connections
    return new Promise<TableClient | undefined>(async (resolve, reject) => {
      try {
        setTimeout(() => reject('Connection timeout'), MAX_CONNECTION_TIMEOUT);

        if (!table) {
          return resolve(undefined);
        }

        const parsedConnectionOption = AzureTableStorageAdapter.getParsedConnectionOptions(
          this.connectionOption,
        );

        const endpoint = `${parsedConnectionOption.DefaultEndpointsProtocol}://${parsedConnectionOption.AccountName}.table.${parsedConnectionOption.EndpointSuffix}`;
        const cred = AzureTableStorageAdapter.getAuth(parsedConnectionOption);

        resolve(new TableClient(endpoint, table, cred));
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

        await this.getTableServiceClient();

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
    const serviceClient = await this.getTableServiceClient();

    const tablesResponse = await serviceClient.listTables();

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
    const tableClient = await this.getTableClient(table);

    const page = await tableClient
      ?.listEntities()
      .byPage({ maxPageSize: MAX_ITEM_COUNT_TO_SCAN })
      .next();

    const items: any[] = [];

    if (page && !page.done) {
      for await (const entity of page.value) {
        if (entity['rowKey']) {
          items.push(entity);
        }
      }
    }

    return BaseDataAdapter.inferTypesFromItems(items);
  }

  async execute(sql: string, database?: string, table?: string): Promise<SqluiCore.Result> {
    try {
      const serviceClient = await this.getTableServiceClient();
      const tableClient = await this.getTableClient(table);

      const res: any = await eval(sql);

      console.log('>> TODO res', res);

      try {
        const raw: any[] = [];
        for await (const entity of res) {
          raw.push(entity);
        }

        return { ok: true, raw };
      } catch (err) {
        // object is not iterrable
        return { ok: true, meta: res };
      }
    } catch (error: any) {
      console.log(error);
      return { ok: false, error: JSON.stringify(error, null, 2) };
    } finally {
      this.closeConnection();
    }
  }
}
