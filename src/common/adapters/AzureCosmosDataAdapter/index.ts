import { CosmosClient } from "@azure/cosmos";
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/**
 * @type {Number} maximum number of items to scan for column metadata
 */
const MAX_ITEM_COUNT_TO_SCAN = 5;

/**
 * Data adapter for Azure Cosmos DB, handling connections, metadata retrieval, and query execution.
 */
export default class AzureCosmosDataAdapter extends BaseDataAdapter implements IDataAdapter {
  // https://docs.microsoft.com/en-us/azure/cosmos-db/sql/sql-api-nodejs-get-started?tabs=windows

  private _connection?: CosmosClient;

  private async getConnection(): Promise<CosmosClient> {
    // attempt to pull in connections
    return new Promise<CosmosClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject("Connection Timeout"), MAX_CONNECTION_TIMEOUT);

        const client = new CosmosClient(this.getConnectionString());
        this._connection = client;

        resolve(client);
      } catch (err) {
        console.error("AzureCosmosDataAdapter:getConnection", err);
        reject(err);
      }
    });
  }

  /** Disposes the Cosmos DB client held by this adapter. */
  async disconnect() {
    try {
      this._connection?.dispose();
    } catch (err) {
      console.error("AzureCosmosDataAdapter:disconnect", err);
    }
    this._connection = undefined;
  }

  /** Authenticates by verifying the CosmosDB read endpoint is accessible. */
  async authenticate() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        setTimeout(() => reject("Connection timeout"), MAX_CONNECTION_TIMEOUT);

        await this.getDatabases();

        const client = await this.getConnection();
        const readEndpoint = await client.getReadEndpoint();

        if (readEndpoint) {
          resolve();
        } else {
          throw new Error("Failed to connect to Azure CosmosDB - Empty read endpoint");
        }
      } catch (err) {
        console.error("AzureCosmosDataAdapter:authenticate", err);
        reject(err);
      }
    });
  }

  /**
   * Retrieves all databases from the Azure Cosmos DB account.
   * @returns Array of database metadata objects, or empty array on error.
   */
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
      console.error("AzureCosmosDataAdapter:getDatabases", err);
      return [];
    }
  }

  /**
   * Retrieves all containers in the specified Cosmos DB database.
   * @param database - The Cosmos DB database identifier.
   * @returns Array of table (container) metadata objects, or empty array on error.
   */
  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // https://azure.github.io/azure-cosmos-js/classes/containers.html#readall
    if (!database) {
      throw new Error("Database is a required field for Azure CosmosDB");
    }

    try {
      const client = await this.getConnection();

      const { resources: tables } = await client.database(database).containers.readAll().fetchAll();

      return tables.map((table) => ({
        name: table.id,
        columns: [],
      }));
    } catch (err) {
      console.error("AzureCosmosDataAdapter:getTables", err);
      return [];
    }
  }

  /**
   * Infers column metadata by scanning sample items from a Cosmos DB container.
   * @param table - The container name.
   * @param database - The Cosmos DB database identifier.
   * @returns Array of inferred column metadata objects, or empty array on error.
   */
  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    if (!database) {
      throw new Error("Database is a required field for Azure CosmosDB");
    }

    try {
      const client = await this.getConnection();

      const { resources: items } = await client
        .database(database)
        .container(table)
        .items.query({
          query: `SELECT * from c OFFSET 0 LIMIT ${MAX_ITEM_COUNT_TO_SCAN}`,
        })
        .fetchAll();

      return BaseDataAdapter.inferTypesFromItems(items).map((column) => ({
        ...column,
        primaryKey: column.name === "id",
      }));
    } catch (err) {
      console.error("AzureCosmosDataAdapter:getColumns", err);
      return [];
    }
  }

  /**
   * Executes a Cosmos DB query or SDK expression against a container.
   * @param sql - A raw SQL query or JS SDK expression targeting a Cosmos DB container.
   * @param database - The Cosmos DB database identifier (required for raw SQL mode).
   * @param table - The container name (required for raw SQL mode).
   * @returns The query result with items or error information.
   */
  async execute(sql: string, database?: string, table?: string): Promise<SqluiCore.Result> {
    try {
      const client = await this.getConnection();

      let items: any;

      if ((sql.includes("db") || sql.includes("client")) && (sql.includes(".database") || sql.includes(".container"))) {
        // run as raw query
        //@ts-ignore
        const res: any = await eval(sql); // eslint-disable-line no-eval

        items = res.item || res.resource || res.resources;
      } else {
        // run as sql query
        if (!table) {
          throw new Error("Table is a required field for Azure CosmosDB in raw SQL mode");
        }

        if (!database) {
          throw new Error("Database is a required field for Azure CosmosDB in raw SQL mode");
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
      console.error("AzureCosmosDataAdapter:execute", error);
      let errorMessage: string;
      try {
        errorMessage = JSON.stringify(error, null, 2);
      } catch {
        errorMessage = error?.message || error?.toString() || "Unknown error";
      }
      return { ok: false, error: errorMessage };
    }
  }
}
