import { SqlAction, SqluiCore } from 'typings';
import IDataScript from 'src/common/adapters/IDataScript';

export function getDivider(): SqlAction.Output {
  return {
    label: 'divider',
  };
}

export default abstract class BaseDataScript implements IDataScript{
  /**
 * @type {Array} ordered list of supported dialects is shown in the connection hints
 */
  static SUPPORTED_DIALECTS = [
    'mysql',
    'mariadb',
    'mssql',
    'postgres',
    'sqlite',
    'cassandra',
    'mongodb',
    'redis',
    'cosmosdb',
    'aztable',
  ];

  getIsTableIdRequiredForQuery() {
    return false
  }

  getSyntaxMode() {
    return 'sql';
  }

  //
  getTableScripts  () : SqlAction.TableActionScriptGenerator[]{
    return [];
  }
  getDatabaseScripts  () : SqlAction.DatabaseActionScriptGenerator[]{
    return [];
  }
  getConnectionScripts  () : SqlAction.ConnectionActionScriptGenerator[]{
    return [];
  }
  getSampleConnectionString (dialect?: SqluiCore.Dialect) {
    return ''
  }
}
