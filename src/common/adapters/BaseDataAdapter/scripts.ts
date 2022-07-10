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

  static getIsTableIdRequiredForQuery(dialect?: SqluiCore.Dialect) {
    switch (dialect) {
      default:
        return false;
      case 'aztable':
      case 'cosmosdb':
        return true;
    }
  }

  static getSyntaxModeByDialect(dialect?: SqluiCore.Dialect): 'javascript' | 'sql' {
    switch (dialect) {
      default:
        return 'sql';
      case 'mongodb':
      case 'redis':
      case 'cosmosdb':
      case 'aztable':
        return 'javascript';
    }
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
