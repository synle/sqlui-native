import { SqluiCore } from "typings";

/**
 * Interface that all database adapters must implement for CRUD operations.
 */
export default interface IDataAdapter {
  /** The database dialect (e.g., mysql, postgres, sqlite). */
  dialect?: SqluiCore.Dialect;
  /** Tests the connection to the database. */
  authenticate: () => Promise<void>;
  /** Retrieves all databases from the connection. */
  getDatabases: () => Promise<SqluiCore.DatabaseMetaData[]>;
  /**
   * Retrieves all tables for a given database.
   * @param database - The database name, or undefined for dialects that don't use databases.
   */
  getTables: (database: string | undefined) => Promise<SqluiCore.TableMetaData[]>;
  /**
   * Retrieves column metadata for a given table.
   * @param table - The table name.
   * @param database - The database name, or undefined for dialects that don't use databases.
   */
  getColumns: (table: string, database: string | undefined) => Promise<SqluiCore.ColumnMetaData[]>;
  /**
   * Executes a raw query against the database.
   * @param sql - The SQL or query string to execute.
   * @param database - The target database name.
   * @param table - The target table name (used by some NoSQL adapters).
   * @returns The query result containing raw data and metadata.
   */
  execute: (sql: string, database: string | undefined, table: string | undefined) => Promise<SqluiCore.Result>;
  /** Disconnects from the database and cleans up resources. */
  disconnect: () => Promise<void>;
}
