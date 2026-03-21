import { SqlAction, SqluiCore } from "typings";

/**
 * Interface defining script generation capabilities for a database dialect.
 * Provides methods for generating SQL scripts, dialect metadata, and code snippets.
 */
export default interface IDataScript {
  /** List of supported dialect identifiers (e.g., ["mysql", "mariadb"]). */
  dialects?: SqluiCore.Dialect[] | string[];
  /** Returns the connection form input field definitions for this dialect. */
  getConnectionFormInputs: () => string[][];
  /**
   * Returns the connection string format describing the structure after the scheme prefix.
   * - "url": Standard URI — `dialect://user:pass@host:port` (relational DBs, Cassandra, MongoDB, Redis)
   * - "json": JSON object — `dialect://{"key":"value",...}` (Salesforce)
   * - "ado": ADO.NET-style semicolon-delimited key=value pairs — `dialect://Key1=val1;Key2=val2` (Azure Table Storage, CosmosDB)
   */
  getConnectionStringFormat: () => "url" | "json" | "ado";

  // misc methods
  /**
   * Checks whether a given dialect string is supported by this script implementation.
   * @param dialect - The dialect identifier to check.
   */
  isDialectSupported: (dialect?: string) => boolean;
  /** Whether queries require a table ID to be specified. */
  getIsTableIdRequiredForQuery: () => boolean;
  /** Returns the editor syntax mode (e.g., "sql", "javascript"). */
  getSyntaxMode: () => string;
  /** Whether this dialect supports schema migration scripts. */
  supportMigration: () => boolean;
  /** Whether this dialect supports the create record form UI. */
  supportCreateRecordForm: () => boolean;
  /** Whether this dialect supports the edit record form UI. */
  supportEditRecordForm: () => boolean;
  /** Whether this dialect supports data visualization. */
  supportVisualization: () => boolean;

  // dialect definitions
  /**
   * Resolves and returns the canonical dialect type.
   * @param dialect - The dialect to resolve.
   */
  getDialectType: (dialect?: SqluiCore.Dialect) => SqluiCore.Dialect | undefined;
  /**
   * Returns the display name for a dialect.
   * @param dialect - The dialect identifier.
   */
  getDialectName: (dialect?: SqluiCore.Dialect) => string;
  /**
   * Returns the icon (as a base64 or URL string) for a dialect.
   * @param dialect - The dialect identifier.
   */
  getDialectIcon: (dialect?: SqluiCore.Dialect) => string;

  // core script methods
  /** Returns table-level action script generators (e.g., select, insert, delete). */
  getTableScripts: () => SqlAction.TableActionScriptGenerator[];
  /** Returns database-level action script generators (e.g., create/drop database). */
  getDatabaseScripts: () => SqlAction.DatabaseActionScriptGenerator[];
  /** Returns connection-level action script generators. */
  getConnectionScripts: () => SqlAction.ConnectionActionScriptGenerator[];
  /**
   * Returns a sample connection string for the given dialect.
   * @param dialect - The dialect identifier.
   */
  getSampleConnectionString: (dialect?: SqluiCore.Dialect) => string;
  /**
   * Returns a sample SELECT query for a given table.
   * @param tableActionInput - The table input containing dialect, table, and column info.
   */
  getSampleSelectQuery: (tableActionInput: SqlAction.TableInput) => SqlAction.Output | undefined;

  // snippet
  /**
   * Generates a code snippet for executing a query in a given programming language.
   * @param connection - The connection properties.
   * @param query - The query to generate a snippet for.
   * @param language - The target programming language.
   */
  getCodeSnippet: (connection, query, language) => string;
}
