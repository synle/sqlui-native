import BaseDataScript from 'src/common/adapters/BaseDataAdapter/scripts';
import { SqlAction } from 'typings';
export declare const REDIS_ADAPTER_PREFIX = "db";
export declare function getSetValue(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getGet(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getScan(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getHset(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getHget(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getHvals(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getHexist(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getListLPush(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getListRPush(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getListLPop(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getListRPop(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getListGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getSetGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getSetAddItems(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getSetIsMember(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getSetCount(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getSetRemoveLastItem(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getSortedSetGetItems(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getSortedSetAddItem(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare function getPublishMessage(input: SqlAction.TableInput): SqlAction.Output | undefined;
export declare class ConcreteDataScripts extends BaseDataScript {
    dialects: string[];
    getIsTableIdRequiredForQuery(): boolean;
    getSyntaxMode(): string;
    supportMigration(): boolean;
    supportCreateRecordForm(): boolean;
    supportEditRecordForm(): boolean;
    getDialectName(dialect: any): "Redis with SSL" | "Redis";
    getDialectIcon(dialect: any): string;
    getTableScripts(): (typeof getSetValue)[];
    getDatabaseScripts(): any[];
    getConnectionScripts(): any[];
    getSampleConnectionString(dialect: any): "rediss://username:password@localhost:6379" | "redis://localhost:6379";
    getSampleSelectQuery(tableActionInput: any): any;
    getCodeSnippet(connection: any, query: any, language: any): string;
}
declare const _default: ConcreteDataScripts;
export default _default;
