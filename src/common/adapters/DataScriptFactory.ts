import BaseDataScript, { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import AzureCosmosDataAdapterScripts from 'src/common/adapters/AzureCosmosDataAdapter/scripts';
import AzureTableStorageAdapterScripts from 'src/common/adapters/AzureTableStorageAdapter/scripts';
import CassandraDataAdapterScripts from 'src/common/adapters/CassandraDataAdapter/scripts';
import MongoDBDataAdapterScripts from 'src/common/adapters/MongoDBDataAdapter/scripts';
import RedisDataAdapterScripts from 'src/common/adapters/RedisDataAdapter/scripts';
import RelationalDataAdapterScripts from 'src/common/adapters/RelationalDataAdapter/scripts';
import { formatJS, formatSQL } from 'src/frontend/utils/formatter';
import { SqlAction, SqluiCore } from 'typings';
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
      switch (action.formatter) {
        case 'sql':
          action.query = formatSQL(action.query || '');
          break;
        case 'js':
          action.query = formatJS(action.query || '');
          break;
      }
      actions.push(action);
    }
  }

  return actions;
}

/**
 * @type {Array} ordered list of supported dialects is shown in the connection hints
 */
export const SUPPORTED_DIALECTS = BaseDataScript.SUPPORTED_DIALECTS;

export function getSyntaxModeByDialect (dialect?: string) {
  return _getImplementation(dialect)?.getSyntaxMode() || 'sql';
}

export function getIsTableIdRequiredForQuery (dialect?: string) {
  return _getImplementation(dialect)?.getIsTableIdRequiredForQuery() || false;
}

export function getSampleConnectionString(dialect?: string) {
  return _getImplementation(dialect)?.getSampleConnectionString(dialect as SqluiCore.Dialect) || '';
}

export function getTableActions(actionInput: SqlAction.TableInput) {
  const scriptsToUse: SqlAction.TableActionScriptGenerator[] = _getImplementation(actionInput.dialect)?.getTableScripts() || [];
  return _formatScripts(actionInput, scriptsToUse);
}

export function getSampleSelectQuery(actionInput: SqlAction.TableInput) {
  const scriptsToUse: SqlAction.TableActionScriptGenerator[] = _getImplementation(actionInput.dialect)?.getTableScripts() || [];
  return _formatScripts(actionInput, scriptsToUse).filter((script) =>
    script.label.includes('Select'),
  )[0];
}

export function getDatabaseActions(actionInput: SqlAction.DatabaseInput) {
  const scriptsToUse: SqlAction.DatabaseActionScriptGenerator[] = _getImplementation(actionInput.dialect)?.getDatabaseScripts() || [];
  return _formatScripts(actionInput, scriptsToUse);
}

export function getConnectionActions(actionInput: SqlAction.ConnectionInput) {
  const scriptsToUse: SqlAction.DatabaseActionScriptGenerator[] = _getImplementation(actionInput.dialect)?.getConnectionScripts() || [];
  return _formatScripts(actionInput, scriptsToUse);
}

function _getImplementation(dialect?: string) {
  switch(dialect){
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      return RelationalDataAdapterScripts
    case 'cassandra':
      return CassandraDataAdapterScripts
    case 'mongodb':
      return MongoDBDataAdapterScripts
    case 'redis':
      return RedisDataAdapterScripts
    case 'cosmosdb':
      return AzureCosmosDataAdapterScripts
    case 'aztable':
      return AzureTableStorageAdapterScripts
  }
}
