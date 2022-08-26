import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';
export default class AzureTableStorageAdapter extends BaseDataAdapter implements IDataAdapter {
    constructor(connectionOption: string);
    private getTableServiceClient;
    private getTableClient;
    private closeConnection;
    authenticate(): Promise<void>;
    getDatabases(): Promise<SqluiCore.DatabaseMetaData[]>;
    getTables(database?: string): Promise<SqluiCore.TableMetaData[]>;
    getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]>;
    execute(sql: string, database?: string, table?: string): Promise<SqluiCore.Result>;
}
