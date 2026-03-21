import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

// Replace with the actual client type from your database driver package.
// Example: import { Client } from 'your-db-driver';
type AdapterClient = any;

/**
 * SampleDataAdapter - Template for creating a new database adapter.
 *
 * This class handles all database operations (connect, authenticate, query metadata, execute).
 * It extends BaseDataAdapter and implements IDataAdapter.
 *
 * To use this template:
 *   1. Copy this directory and rename it to your adapter name (e.g., MyDbDataAdapter/).
 *   2. Rename this class and replace all placeholder values.
 *   3. Install your database driver: npm install your-db-driver
 *   4. Implement each method below.
 *   5. Register in DataAdapterFactory.ts and DataScriptFactory.ts (see CONTRIBUTING.md).
 */
export default class SampleDataAdapter extends BaseDataAdapter implements IDataAdapter {
  private _connection?: AdapterClient;

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  /**
   * Creates and returns a connected database client instance.
   * Stores the client in `this._connection` for reuse across adapter methods.
   * Uses MAX_CONNECTION_TIMEOUT to prevent hanging connections.
   *
   * Implementation checklist:
   *   - Parse `this.connectionOption` to extract host, port, credentials, etc.
   *   - Instantiate the database client from your driver.
   *   - Call the client's connect method and resolve once connected.
   *   - Store the client in `this._connection`.
   */
  private async getConnection(): Promise<AdapterClient> {
    return new Promise<AdapterClient>(async (resolve, reject) => {
      try {
        setTimeout(() => reject("Connection timeout"), MAX_CONNECTION_TIMEOUT);

        // TODO: create and connect your client here
        // Example:
        //   const client = new Client({ connectionString: this.connectionOption });
        //   await client.connect();
        //   this._connection = client;
        //   resolve(client);
        this._connection = {};
        resolve(this._connection);
      } catch (err) {
        console.error("SampleDataAdapter:getConnection", err);
        reject(err);
      }
    });
  }

  /**
   * Disconnects and cleans up resources.
   * Called by the caller (Endpoints.ts / DataAdapterFactory / tests) — never internally.
   *
   * TODO: close and clean up `this._connection` here.
   * Example:
   *   await this._connection?.disconnect();
   */
  async disconnect() {
    try {
      // TODO: close the connection
      // Example: await this._connection?.close();
    } catch (err) {
      console.error("SampleDataAdapter:disconnect", err);
    }
    this._connection = undefined;
  }

  /**
   * Verifies that the connection string is valid and the database is reachable.
   * Called when the user first adds or refreshes a connection.
   */
  async authenticate() {
    await this.getConnection();
  }

  /**
   * Returns the list of databases (or keyspaces, namespaces, etc.) on this connection.
   * Each entry should have a `name` and an empty `tables` array (tables are fetched separately).
   */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    // TODO: query your database engine for the list of databases
    // Example:
    //   const client = await this.getConnection();
    //   const result = await client.listDatabases();
    //   return result.map(db => ({ name: db.name, tables: [] }));
    return [
      {
        name: "TODO_database_name",
        tables: [],
      },
    ];
  }

  /**
   * Returns the list of tables (or collections, etc.) within a given database.
   *
   * @param database - The database name from getDatabases().
   */
  async getTables(_database?: string): Promise<SqluiCore.TableMetaData[]> {
    // TODO: query your database engine for the list of tables in `database`
    // Example:
    //   const client = await this.getConnection();
    //   const result = await client.listTables(database);
    //   return result.map(t => ({ name: t.name, columns: [] }));
    return [
      {
        name: "TODO_table_name",
        columns: [],
      },
    ];
  }

  /**
   * Returns column metadata for a given table and database.
   * Include name, type, and optionally primaryKey, unique flags.
   *
   * @param table - The table name from getTables().
   * @param database - The database name from getDatabases().
   */
  async getColumns(_table?: string, _database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    // TODO: query your database engine for columns in `database`.`table`
    // Example:
    //   return [{ name: 'id', type: 'INT', primaryKey: true }, { name: 'value', type: 'TEXT' }];
    return [];
  }

  /**
   * Executes a query/command against the database and returns the result.
   * This is the core method invoked from the query editor UI.
   *
   * @param sql - The query string entered by the user.
   * @param database - The selected database context.
   * @param table - The selected table context (optional, some adapters use this).
   */
  async execute(sql: string, database?: string, _table?: string): Promise<SqluiCore.Result> {
    try {
      if (!database) {
        throw new Error("Database is a required field");
      }

      const _client = await this.getConnection();

      // TODO: execute the query using your client
      // Example:
      //   const result = await client.query(sql);
      //   return { ok: true, raw: result.rows };
      const raw = [];

      return { ok: true, raw };
    } catch (error: any) {
      console.error("SampleDataAdapter:execute", error);
      return { ok: false, error: JSON.stringify(error, null, 2) };
    }
  }
}
