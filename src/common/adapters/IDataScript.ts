import { SqluiCore, SqlAction } from 'typings';

// this describe the static methods in the interface
export default interface IDataScript {
  getIsTableIdRequiredForQuery: () =>  boolean;
  getSyntaxMode: () => string;

  //
  getTableScripts: () =>  SqlAction.TableActionScriptGenerator[];
  getDatabaseScripts: () =>  SqlAction.DatabaseActionScriptGenerator[];
  getConnectionScripts: () =>  SqlAction.ConnectionActionScriptGenerator[];
  getSampleConnectionString: (dialect?: SqluiCore.Dialect) =>  string;
}
