import { TableClient, TableServiceClient } from "@azure/data-tables";
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/**
 * @type {Number} maximum number of items to scan for column metadata
 */
const MAX_ITEM_COUNT_TO_SCAN = 5;

export default class AzureTableStorageAdapter extends BaseDataAdapter implements IDataAdapter {
  constructor(connectionOption: string) {
    super(connectionOption);
  }

  /**
   * TableServiceClient - Client that provides functions to interact at a Table Service level such as create, list and delete tables
   */
  private async getTableServiceClient() {
    // attempt to pull in connections
    return new Promise<TableServiceClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject("Connection timeout"), MAX_CONNECTION_TIMEOUT);

        const connectionString = this.getConnectionString();
        resolve(TableServiceClient.fromConnectionString(connectionString));
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
        setTimeout(() => reject("Connection timeout"), MAX_CONNECTION_TIMEOUT);

        if (!table) {
          return reject("Table is required to initiate Azure Table TableClient");
        }

        const connectionString = this.getConnectionString();
        resolve(TableClient.fromConnectionString(connectionString, table));
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
        setTimeout(() => reject("Connection timeout"), MAX_CONNECTION_TIMEOUT);

        const serviceClient = await this.getTableServiceClient();
        const props = await serviceClient.getProperties();

        if (props) {
          return resolve();
        }

        throw "Cannot connect to Azure Table";
      } catch (err) {
        reject(err);
      }
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    return [
      {
        name: "Azure Table Storage",
        tables: [],
      },
    ];
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // https://docs.microsoft.com/en-us/javascript/api/overview/azure/data-tables-readme?view=azure-node-latest#list-tables-in-the-account
    try {
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
    } catch (err) {
      return [];
    } finally {
      this.closeConnection();
    }
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    try {
      const tableClient = await this.getTableClient(table);

      const page = await tableClient?.listEntities().byPage({ maxPageSize: MAX_ITEM_COUNT_TO_SCAN }).next();

      const items: any[] = [];

      if (page && !page.done) {
        for await (const entity of page.value) {
          if (entity["rowKey"]) {
            items.push(entity);
          }
        }
      }

      return BaseDataAdapter.inferTypesFromItems(items).map((column) => {
        if (column.name == "partitionKey") {
          column.kind = "clustering";
        } else if (column.name == "rowKey") {
          column.kind = "partition_key";
          column.primaryKey = true;
        }

        return column;
      });
    } catch (err) {
      return [];
    } finally {
      this.closeConnection();
    }
  }

  async execute(sql: string, database?: string, table?: string): Promise<SqluiCore.Result> {
    try {
      const serviceClient = await this.getTableServiceClient();

      let tableClient: TableClient | undefined;

      if (table) {
        tableClient = await this.getTableClient(table);
      }

      const res: any = await eval(sql);

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
      return { ok: false, error: error.toString() };
    } finally {
      this.closeConnection();
    }
  }
}
