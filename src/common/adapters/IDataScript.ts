import { SqlAction, SqluiCore } from 'typings';
// this describe the static methods in the interface
export default interface IDataScript {
  dialects?: SqluiCore.Dialect[] | string[];

  getDialectType: (connectionString: string) => SqluiCore.Dialect | undefined;
  getConnectionFormInputs: () => string[][];

  // misc methods
  isDialectSupported: (targetDialect?: string) => boolean;
  getIsTableIdRequiredForQuery: () => boolean;
  getSyntaxMode: () => string;
  supportMigration: () => boolean;
  supportCreateRecordForm: () => boolean;
  supportEditRecordForm: () => boolean;

  // core script methods
  getTableScripts: () => SqlAction.TableActionScriptGenerator[];
  getDatabaseScripts: () => SqlAction.DatabaseActionScriptGenerator[];
  getConnectionScripts: () => SqlAction.ConnectionActionScriptGenerator[];
  getDialectName: (dialect?: SqluiCore.Dialect) => string;
  getDialectIcon: (dialect?: SqluiCore.Dialect) => string;
  getSampleConnectionString: (dialect?: SqluiCore.Dialect) => string;
  getSampleSelectQuery: (actionInput: SqlAction.TableInput) => SqlAction.Output | undefined;

  // snippet
  getCodeSnippet: (
    connection: SqluiCore.ConnectionProps,
    query: SqluiCore.ConnectionQuery,
    language: SqluiCore.LanguageMode,
  ) => string;
}
