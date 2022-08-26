import BaseDataScript from 'src/common/adapters/BaseDataAdapter/scripts';
import { SqlAction } from 'typings';
export declare const COSMOSDB_ADAPTER_PREFIX = "db";
export declare function getRawSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getSelectById(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getReadItemById(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getSelectSpecificColumns(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getInsert(input: SqlAction.TableInput, value?: Record<string, any>): SqlAction.Output | undefined;
export declare function getBulkInsert(input: SqlAction.TableInput, rows?: Record<string, any>[]): SqlAction.Output | undefined;
export declare function getUpdateWithValues(input: SqlAction.TableInput, value: Record<string, any>, conditions: Record<string, any>): SqlAction.Output | undefined;
export declare function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getCreateContainer(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getDropContainer(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getCreateDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined;
export declare function getCreateDatabaseContainer(input: SqlAction.DatabaseInput): SqlAction.Output | undefined;
export declare function getDropDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined;
export declare function getCreateConnectionDatabase(input: SqlAction.ConnectionInput): SqlAction.Output | undefined;
export declare class ConcreteDataScripts extends BaseDataScript {
    dialects: string[];
    getIsTableIdRequiredForQuery(): boolean;
    getSyntaxMode(): string;
    getConnectionFormInputs(): string[][];
    supportMigration(): boolean;
    supportCreateRecordForm(): boolean;
    supportEditRecordForm(): boolean;
    getTableScripts(): (typeof getInsert)[];
    getDatabaseScripts(): (typeof getCreateDatabase)[];
    getConnectionScripts(): (typeof getCreateConnectionDatabase)[];
    getDialectName(dialect: any): string;
    getSampleConnectionString(dialect: any): string;
    getSampleSelectQuery(tableActionInput: any): SqlAction.Output;
    getCodeSnippet(connection: any, query: any, language: any): string;
}
declare const _default: ConcreteDataScripts;
export default _default;
