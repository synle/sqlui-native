import { SqlAction, SqluiCore } from "typings";
// this describe the static methods in the interface
export default interface IDataScript {
  dialects?: SqluiCore.Dialect[] | string[];
  getConnectionFormInputs: () => string[][];

  // misc methods
  isDialectSupported: (dialect?: string) => boolean;
  getIsTableIdRequiredForQuery: () => boolean;
  getSyntaxMode: () => string;
  supportMigration: () => boolean;
  supportCreateRecordForm: () => boolean;
  supportEditRecordForm: () => boolean;
  supportVisualization: () => boolean;

  // dialect definitions
  getDialectType: (dialect?: SqluiCore.Dialect) => SqluiCore.Dialect | undefined;
  getDialectName: (dialect?: SqluiCore.Dialect) => string;
  getDialectIcon: (dialect?: SqluiCore.Dialect) => string;

  // core script methods
  getTableScripts: () => SqlAction.TableActionScriptGenerator[];
  getDatabaseScripts: () => SqlAction.DatabaseActionScriptGenerator[];
  getConnectionScripts: () => SqlAction.ConnectionActionScriptGenerator[];
  getSampleConnectionString: (dialect?: SqluiCore.Dialect) => string;
  getSampleSelectQuery: (tableActionInput: SqlAction.TableInput) => SqlAction.Output | undefined;

  // snippet
  getCodeSnippet: (connection, query, language) => string;
}
