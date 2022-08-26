import { SqluiCore } from 'typings';
export declare const MAX_CONNECTION_TIMEOUT = 3000;
export default abstract class BaseDataAdapter {
    protected connectionOption: string;
    dialect?: SqluiCore.Dialect;
    constructor(connectionOption: string);
    protected getConnectionString(): string;
    static getConnectionParameters(connection: string): import("connection-string-parser").IConnectionStringParameters;
    static resolveTypes(inputItem: any, incomingTypeConverter?: (type: string, value: any) => string): Record<string, SqluiCore.ColumnMetaData>;
    static inferTypesFromItems(items: any[]): SqluiCore.ColumnMetaData[];
    static inferSqlTypeFromItems(items: any[], toDialectHint?: string): SqluiCore.ColumnMetaData[];
}
