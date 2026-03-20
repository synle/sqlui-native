import { TableClient, TableServiceClient } from "@azure/data-tables";
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/**
 * @type {Number} maximum number of items to scan for column metadata
 */
const MAX_ITEM_COUNT_TO_SCAN = 5;

/**
 * Data adapter for Azure Table Storage, handling connections, metadata retrieval, and query execution.
 */
export default class AzureTableStorageAdapter extends BaseDataAdapter implements IDataAdapter {
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
        console.error("AzureTableStorageAdapter:getTableServiceClient", err);
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
        console.error("AzureTableStorageAdapter:getTableClient", err);
        reject(err);
      }
    });
  }

  /** Disconnects and cleans up resources. No-op for Azure Table Storage (stateless HTTP clients). */
  async disconnect() {}

  /** Authenticates by verifying the Azure Table Storage service is accessible. */
  async authenticate() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        setTimeout(() => reject("Connection timeout"), MAX_CONNECTION_TIMEOUT);

        const serviceClient = await this.getTableServiceClient();
        const props = await serviceClient.getProperties();

        if (props) {
          return resolve();
        }

        throw new Error("Cannot connect to Azure Table");
      } catch (err) {
        console.error("AzureTableStorageAdapter:authenticate", err);
        reject(err);
      }
    });
  }

  /**
   * Returns a single hard-coded database entry for Azure Table Storage.
   * @returns Array with one database metadata object.
   */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    return [
      {
        name: "Azure Table Storage",
        tables: [],
      },
    ];
  }

  /**
   * Retrieves all tables from the Azure Table Storage account.
   * @returns Array of table metadata objects, or empty array on error.
   */
  async getTables(): Promise<SqluiCore.TableMetaData[]> {
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
      console.error("index.ts:push", err);
      return [];
    }
  }

  /**
   * Infers column metadata by scanning sample entities from an Azure Table.
   * @param table - The table name to scan.
   * @returns Array of inferred column metadata objects, or empty array on error.
   */
  async getColumns(table: string): Promise<SqluiCore.ColumnMetaData[]> {
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
      console.error("index.ts:inferTypesFromItems", err);
      return [];
    }
  }

  /**
   * Executes an Azure Table Storage SDK expression using eval-based syntax.
   * @param sql - The SDK expression to evaluate (e.g., using tableClient or serviceClient).
   * @param database - Unused for Azure Table Storage.
   * @param table - Optional table name used to instantiate the TableClient.
   * @returns The result with raw entities or error information.
   */
  async execute(sql: string, database?: string, table?: string): Promise<SqluiCore.Result> {
    try {
      const serviceClient = await this.getTableServiceClient(); // eslint-disable-line @typescript-eslint/no-unused-vars

      let tableClient: TableClient | undefined; // eslint-disable-line @typescript-eslint/no-unused-vars

      if (table) {
        tableClient = await this.getTableClient(table); // eslint-disable-line @typescript-eslint/no-unused-vars
      }

      const res: any = await eval(sql); // eslint-disable-line no-eval

      try {
        const raw: any[] = [];
        for await (const entity of res) {
          raw.push(entity);
        }

        return { ok: true, raw };
      } catch (err) {
        console.error("index.ts:push", err);
        // object is not iterrable
        return { ok: true, meta: res };
      }
    } catch (error: any) {
      console.error("AzureTableStorageAdapter:execute", error);
      return { ok: false, error: error.toString() };
    }
  }
}
