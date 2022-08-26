import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';
export declare function getDataAdapter(connection: string): IDataAdapter;
export declare function getConnectionMetaData(connection: SqluiCore.CoreConnectionProps): Promise<SqluiCore.CoreConnectionMetaData>;
export declare function resetConnectionMetaData(connection: SqluiCore.CoreConnectionProps): SqluiCore.CoreConnectionMetaData;
export declare function getDatabases(sessionId: string, connectionId: string): Promise<SqluiCore.DatabaseMetaData[]>;
export declare function getTables(sessionId: string, connectionId: string, databaseId: string): Promise<SqluiCore.TableMetaData[]>;
export declare function getColumns(sessionId: string, connectionId: string, databaseId: string, tableId: string): Promise<SqluiCore.ColumnMetaData[]>;
