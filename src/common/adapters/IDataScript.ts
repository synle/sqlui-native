import { SqlAction, SqluiCore } from 'typings';
// this describe the static methods in the interface
export default interface IDataScript {
  dialects?: SqluiCore.Dialect[] | string[];

  // misc methods
  getIsTableIdRequiredForQuery: () => boolean;
  getSyntaxMode: () => string;
  isDialectSupportMigration:() => boolean;
  supportEditRecord:() => boolean;
  supportCreateRecord:() => boolean;

  // core script methods
  getTableScripts: () => SqlAction.TableActionScriptGenerator[];
  getDatabaseScripts: () => SqlAction.DatabaseActionScriptGenerator[];
  getConnectionScripts: () => SqlAction.ConnectionActionScriptGenerator[];
  getSampleConnectionString: (dialect?: SqluiCore.Dialect) => string;
}
