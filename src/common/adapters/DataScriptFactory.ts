import AzureCosmosDataAdapterScripts from "src/common/adapters/AzureCosmosDataAdapter/scripts";
import AzureTableStorageAdapterScripts from "src/common/adapters/AzureTableStorageAdapter/scripts";
import BaseDataScript from "src/common/adapters/BaseDataAdapter/scripts";
import CassandraDataAdapterScripts from "src/common/adapters/CassandraDataAdapter/scripts";
import MongoDBDataAdapterScripts from "src/common/adapters/MongoDBDataAdapter/scripts";
import RedisDataAdapterScripts from "src/common/adapters/RedisDataAdapter/scripts";
import RelationalDataAdapterScripts from "src/common/adapters/RelationalDataAdapter/scripts";
import { formatJS, formatSQL } from "src/frontend/utils/formatter";
import { SqlAction, SqluiCore } from "typings";
/**
 * Formats a query string using the specified formatter (sql, js/javascript, or none).
 * @param formatter - The formatter name to apply ("sql", "js", "javascript", or undefined for no-op).
 * @param query - The raw query string to format.
 * @returns The formatted query string.
 */
function _formatScript(formatter?: string, query?: string) {
  query = query || "";
  switch (formatter) {
    case "sql":
      return formatSQL(query);
    case "js":
    case "javascript":
      return formatJS(query);
    default:
      return query;
  }
}

/**
 * Runs a list of script generator functions against an action input and formats each resulting query.
 * @param actionInput - The table, database, or connection input to pass to each generator.
 * @param generatorFuncs - Array of script generator functions to invoke.
 * @returns Array of formatted action outputs (undefined-producing generators are skipped).
 */
function _formatScripts(
  actionInput: SqlAction.TableInput | SqlAction.DatabaseInput | SqlAction.ConnectionInput,
  generatorFuncs: SqlAction.TableActionScriptGenerator[] | SqlAction.DatabaseActionScriptGenerator[],
) {
  const actions: SqlAction.Output[] = [];

  for (const fn of generatorFuncs) {
    //@ts-ignore
    const action = fn(actionInput);
    if (action) {
      if (action.query) {
        action.query = _formatScript(action?.formatter, action?.query);
      }
      actions.push(action);
    }
  }

  return actions;
}

/**
 * Finds and returns the script implementation that supports the given dialect.
 * @param dialect - The dialect identifier to look up.
 * @returns The matching BaseDataScript instance, or undefined if not found.
 */
function _getImplementation(dialect?: string) {
  if (!dialect) {
    return undefined;
  }

  for (const implementation of getAllImplementations()) {
    if (implementation.isDialectSupported(dialect)) {
      return implementation;
    }
  }
}

/**
 * Returns all registered dialect script implementations.
 * @returns Array of all BaseDataScript instances.
 */
export function getAllImplementations(): BaseDataScript[] {
  return [
    RelationalDataAdapterScripts,
    CassandraDataAdapterScripts,
    MongoDBDataAdapterScripts,
    RedisDataAdapterScripts,
    AzureCosmosDataAdapterScripts,
    AzureTableStorageAdapterScripts,
  ];
}

/**
 * Returns the connection form input field definitions for the given dialect.
 * @param dialect - The dialect identifier.
 */
export function getConnectionFormInputs(dialect?: string) {
  return _getImplementation(dialect)?.getConnectionFormInputs() || [];
}

/**
 * Reducer that appends all dialects from a script implementation to the accumulator.
 * @param res - The accumulator array of dialect strings.
 * @param script - The script implementation to extract dialects from.
 * @returns The updated accumulator.
 */
export function consolidateDialects(res: string[], script: BaseDataScript) {
  for (const dialect of script.dialects) {
    res.push(dialect);
  }
  return res;
}

/** Ordered list of all supported dialect identifiers across all implementations. */
export const SUPPORTED_DIALECTS = getAllImplementations().reduce<string[]>(consolidateDialects, []);

/** List of dialect identifiers that support schema migration. */
export const DIALECTS_SUPPORTING_MIGRATION = getAllImplementations()
  .filter((script) => script.supportMigration())
  .reduce<string[]>(consolidateDialects, []);

/** List of dialect identifiers that support the create record form. */
export const DIALECTS_SUPPORTING_CREATE_FORM = getAllImplementations()
  .filter((script) => script.supportCreateRecordForm())
  .reduce<string[]>(consolidateDialects, []);

/** List of dialect identifiers that support the edit record form. */
export const DIALECTS_SUPPORTING_EDIT_FORM = getAllImplementations()
  .filter((script) => script.supportEditRecordForm())
  .reduce<string[]>(consolidateDialects, []);

/**
 * Checks whether a dialect supports schema migration.
 * @param dialect - The dialect identifier.
 */
export function isDialectSupportMigration(dialect?: string) {
  return dialect && DIALECTS_SUPPORTING_MIGRATION.includes(dialect);
}

/**
 * Checks whether a dialect supports the create record form.
 * @param dialect - The dialect identifier.
 */
export function isDialectSupportCreateRecordForm(dialect?: string) {
  return dialect && DIALECTS_SUPPORTING_CREATE_FORM.includes(dialect);
}

/**
 * Checks whether a dialect supports the edit record form.
 * @param dialect - The dialect identifier.
 */
export function isDialectSupportEditRecordForm(dialect?: string) {
  return dialect && DIALECTS_SUPPORTING_EDIT_FORM.includes(dialect);
}

/**
 * Checks whether a dialect supports data visualization.
 * @param dialect - The dialect identifier.
 */
export function isDialectSupportVisualization(dialect?: string) {
  return _getImplementation(dialect)?.supportVisualization() || false;
}

/**
 * Returns the editor syntax mode for a dialect (e.g., "sql", "javascript").
 * @param dialect - The dialect identifier.
 */
export function getSyntaxModeByDialect(dialect?: string) {
  return _getImplementation(dialect)?.getSyntaxMode() || "sql";
}

/**
 * Checks whether queries for the given dialect require a table ID to be specified.
 * @param dialect - The dialect identifier.
 */
export function getIsTableIdRequiredForQueryByDialect(dialect?: string) {
  return _getImplementation(dialect)?.getIsTableIdRequiredForQuery() || false;
}

/**
 * Extracts the dialect scheme from a connection string URI.
 * @param connection - The connection string (e.g., "mysql://localhost:3306").
 * @returns The dialect string (e.g., "mysql"), or empty string if no scheme found.
 */
export function getDialectTypeFromConnectionString(connection: string) {
  if (connection.match(/^[a-z0-9+-]+:\/\//i)) {
    return connection.substring(0, connection.indexOf(":")).toLowerCase();
  }

  return "";
}

/**
 * Resolves the canonical dialect type from a connection string.
 * @param connection - The connection string URI.
 * @returns The resolved Dialect type, or undefined if not supported.
 */
export function getDialectType(connection: string) {
  const dialect = getDialectTypeFromConnectionString(connection);
  return _getImplementation(dialect)?.getDialectType(dialect as SqluiCore.Dialect);
}

/**
 * Returns the human-readable display name for a dialect.
 * @param dialect - The dialect identifier.
 */
export function getDialectName(dialect?: string) {
  return _getImplementation(dialect)?.getDialectName(dialect as SqluiCore.Dialect) || "";
}

/**
 * Returns the icon (as a base64 or URL string) for a dialect.
 * @param dialect - The dialect identifier.
 */
export function getDialectIcon(dialect?: string) {
  return _getImplementation(dialect)?.getDialectIcon(dialect as SqluiCore.Dialect) || "";
}

/**
 * Returns a sample connection string for a dialect (used in UI hints).
 * @param dialect - The dialect identifier.
 */
export function getSampleConnectionString(dialect?: string) {
  return _getImplementation(dialect)?.getSampleConnectionString(dialect as SqluiCore.Dialect) || "";
}

/**
 * Generates and formats a sample SELECT query for a given table input.
 * @param actionInput - The table input containing dialect, table, column, and query size info.
 * @returns The formatted query string, or empty string if not supported.
 */
export function getSampleSelectQuery(actionInput: SqlAction.TableInput) {
  actionInput.querySize = actionInput.querySize || 50;

  const action = _getImplementation(actionInput.dialect)?.getSampleSelectQuery(actionInput);
  return _formatScript(action?.formatter, action?.query);
}

/**
 * Generates all available table-level action scripts for the given input.
 * @param actionInput - The table input containing dialect, table, and column info.
 * @returns Array of formatted action outputs.
 */
export function getTableActions(actionInput: SqlAction.TableInput) {
  const scriptsToUse: SqlAction.TableActionScriptGenerator[] = _getImplementation(actionInput.dialect)?.getTableScripts() || [];
  return _formatScripts(actionInput, scriptsToUse);
}

/**
 * Generates all available database-level action scripts for the given input.
 * @param actionInput - The database input containing dialect and database info.
 * @returns Array of formatted action outputs.
 */
export function getDatabaseActions(actionInput: SqlAction.DatabaseInput) {
  const scriptsToUse: SqlAction.DatabaseActionScriptGenerator[] = _getImplementation(actionInput.dialect)?.getDatabaseScripts() || [];
  return _formatScripts(actionInput, scriptsToUse);
}

/**
 * Generates all available connection-level action scripts for the given input.
 * @param actionInput - The connection input containing dialect info.
 * @returns Array of formatted action outputs.
 */
export function getConnectionActions(actionInput: SqlAction.ConnectionInput) {
  const scriptsToUse: SqlAction.DatabaseActionScriptGenerator[] = _getImplementation(actionInput.dialect)?.getConnectionScripts() || [];
  return _formatScripts(actionInput, scriptsToUse);
}

/**
 * Generates a formatted code snippet for executing a query in a given programming language.
 * @param connection - The connection properties including dialect and connection string.
 * @param query - The query to generate a snippet for.
 * @param language - The target programming language (javascript, python, java).
 * @returns The formatted code snippet string.
 */
export function getCodeSnippet(connection: SqluiCore.ConnectionProps, query: SqluiCore.ConnectionQuery, language: SqluiCore.LanguageMode) {
  const cleanedUpQuery = { ...query };
  cleanedUpQuery.sql = cleanedUpQuery.sql || "";

  return _formatScript(language, _getImplementation(connection?.dialect)?.getCodeSnippet(connection, cleanedUpQuery, language));
}
