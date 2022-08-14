import AzureCosmosDataAdapterScripts from 'src/common/adapters/AzureCosmosDataAdapter/scripts';
import AzureTableStorageAdapterScripts from 'src/common/adapters/AzureTableStorageAdapter/scripts';
import BaseDataScript from 'src/common/adapters/BaseDataAdapter/scripts';
import CassandraDataAdapterScripts from 'src/common/adapters/CassandraDataAdapter/scripts';
import MongoDBDataAdapterScripts from 'src/common/adapters/MongoDBDataAdapter/scripts';
import RedisDataAdapterScripts from 'src/common/adapters/RedisDataAdapter/scripts';
import RelationalDataAdapterScripts from 'src/common/adapters/RelationalDataAdapter/scripts';
import { formatJS, formatSQL } from 'src/frontend/utils/formatter';
import { SqlAction, SqluiCore } from 'typings';
function _formatScript(formatter?: string, query?: string) {
  query = query || '';
  switch (formatter) {
    case 'sql':
      return formatSQL(query);
    case 'js':
    case 'javascript':
      return formatJS(query);
    default:
      return query;
  }
}

function _formatScripts(
  actionInput: SqlAction.TableInput | SqlAction.DatabaseInput | SqlAction.ConnectionInput,
  generatorFuncs:
    | SqlAction.TableActionScriptGenerator[]
    | SqlAction.DatabaseActionScriptGenerator[],
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

export function getConnectionFormInputs(dialect?: string) {
  return _getImplementation(dialect)?.getConnectionFormInputs() || [];
}

export function consolidateDialects(res: string[], script: BaseDataScript) {
  for (const dialect of script.dialects) {
    res.push(dialect);
  }
  return res;
}

/**
 * @type {Array} ordered list of supported dialects is shown in the connection hints
 */
export const SUPPORTED_DIALECTS = getAllImplementations().reduce<string[]>(consolidateDialects, []);

export const DIALECTS_SUPPORTING_MIGRATION = getAllImplementations()
  .filter((script) => script.supportMigration())
  .reduce<string[]>(consolidateDialects, []);

export const DIALECTS_SUPPORTING_CREATE_FORM = getAllImplementations()
  .filter((script) => script.supportCreateRecordForm())
  .reduce<string[]>(consolidateDialects, []);

export const DIALECTS_SUPPORTING_EDIT_FORM = getAllImplementations()
  .filter((script) => script.supportEditRecordForm())
  .reduce<string[]>(consolidateDialects, []);

export function isDialectSupportMigration(dialect?: string) {
  return dialect && DIALECTS_SUPPORTING_MIGRATION.indexOf(dialect) >= 0;
}

export function isDialectSupportCreateRecordForm(dialect?: string) {
  return dialect && DIALECTS_SUPPORTING_CREATE_FORM.indexOf(dialect) >= 0;
}

export function isDialectSupportEditRecordForm(dialect?: string) {
  return dialect && DIALECTS_SUPPORTING_EDIT_FORM.indexOf(dialect) >= 0;
}

export function getSyntaxModeByDialect(dialect?: string) {
  return _getImplementation(dialect)?.getSyntaxMode() || 'sql';
}

export function getIsTableIdRequiredForQueryByDialect(dialect?: string) {
  return _getImplementation(dialect)?.getIsTableIdRequiredForQuery() || false;
}

export function getDialectType(connection: string) {
  // TODO: properly do this with regex
  const dialect = connection.substr(0, connection.indexOf(':')).toLowerCase();
  return _getImplementation(dialect)?.getDialectType(dialect as SqluiCore.Dialect);
}

export function getDialectName(dialect?: string) {
  return _getImplementation(dialect)?.getDialectName(dialect as SqluiCore.Dialect) || '';
}

export function getDialectIcon(dialect?: string) {
  return _getImplementation(dialect)?.getDialectIcon(dialect as SqluiCore.Dialect) || '';
}

export function getSampleConnectionString(dialect?: string) {
  return _getImplementation(dialect)?.getSampleConnectionString(dialect as SqluiCore.Dialect) || '';
}

export function getSampleSelectQuery(actionInput: SqlAction.TableInput) {
  actionInput.querySize = actionInput.querySize || 50;

  const action = _getImplementation(actionInput.dialect)?.getSampleSelectQuery(actionInput);
  return _formatScript(action?.formatter, action?.query);
}

export function getTableActions(actionInput: SqlAction.TableInput) {
  const scriptsToUse: SqlAction.TableActionScriptGenerator[] =
    _getImplementation(actionInput.dialect)?.getTableScripts() || [];
  return _formatScripts(actionInput, scriptsToUse);
}

export function getDatabaseActions(actionInput: SqlAction.DatabaseInput) {
  const scriptsToUse: SqlAction.DatabaseActionScriptGenerator[] =
    _getImplementation(actionInput.dialect)?.getDatabaseScripts() || [];
  return _formatScripts(actionInput, scriptsToUse);
}

export function getConnectionActions(actionInput: SqlAction.ConnectionInput) {
  const scriptsToUse: SqlAction.DatabaseActionScriptGenerator[] =
    _getImplementation(actionInput.dialect)?.getConnectionScripts() || [];
  return _formatScripts(actionInput, scriptsToUse);
}

export function getCodeSnippet(
  connection: SqluiCore.ConnectionProps,
  query: SqluiCore.ConnectionQuery,
  language: SqluiCore.LanguageMode,
) {
  const cleanedUpQuery = { ...query };
  cleanedUpQuery.sql = cleanedUpQuery.sql || '';

  return _formatScript(
    language,
    _getImplementation(connection?.dialect)?.getCodeSnippet(connection, cleanedUpQuery, language),
  );
}
