import { SqlAction, SqluiCore } from 'typings';
export default interface IDataScript {
    dialects?: SqluiCore.Dialect[] | string[];
    getConnectionFormInputs: () => string[][];
    isDialectSupported: (dialect?: string) => boolean;
    getIsTableIdRequiredForQuery: () => boolean;
    getSyntaxMode: () => string;
    supportMigration: () => boolean;
    supportCreateRecordForm: () => boolean;
    supportEditRecordForm: () => boolean;
    supportVisualization: () => boolean;
    getDialectType: (dialect?: SqluiCore.Dialect) => SqluiCore.Dialect | undefined;
    getDialectName: (dialect?: SqluiCore.Dialect) => string;
    getDialectIcon: (dialect?: SqluiCore.Dialect) => string;
    getTableScripts: () => SqlAction.TableActionScriptGenerator[];
    getDatabaseScripts: () => SqlAction.DatabaseActionScriptGenerator[];
    getConnectionScripts: () => SqlAction.ConnectionActionScriptGenerator[];
    getSampleConnectionString: (dialect?: SqluiCore.Dialect) => string;
    getSampleSelectQuery: (tableActionInput: SqlAction.TableInput) => SqlAction.Output | undefined;
    getCodeSnippet: (connection: any, query: any, language: any) => string;
}
