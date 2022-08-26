import IDataScript from 'src/common/adapters/IDataScript';
import { SqlAction, SqluiCore } from 'typings';
export declare function getDivider(): SqlAction.Output;
export default abstract class BaseDataScript implements IDataScript {
    dialects: string[];
    isDialectSupported(dialect?: string): boolean;
    getConnectionFormInputs(): string[][];
    getIsTableIdRequiredForQuery(): boolean;
    getSyntaxMode(): string;
    supportMigration(): boolean;
    supportCreateRecordForm(): boolean;
    supportEditRecordForm(): boolean;
    supportVisualization(): boolean;
    getDialectType(dialect?: SqluiCore.Dialect): SqluiCore.Dialect;
    getDialectName(dialect?: SqluiCore.Dialect): string;
    getDialectIcon(dialect?: SqluiCore.Dialect): string;
    getTableScripts(): SqlAction.TableActionScriptGenerator[];
    getDatabaseScripts(): SqlAction.DatabaseActionScriptGenerator[];
    getConnectionScripts(): SqlAction.ConnectionActionScriptGenerator[];
    getSampleConnectionString(dialect?: SqluiCore.Dialect): string;
    getSampleSelectQuery(actionInput: SqlAction.TableInput): SqlAction.Output | undefined;
    getCodeSnippet(connection: SqluiCore.ConnectionProps, query: SqluiCore.ConnectionQuery, language: SqluiCore.LanguageMode): string;
}
