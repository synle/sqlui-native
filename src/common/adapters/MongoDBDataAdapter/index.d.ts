import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';
export default class MongoDBDataAdapter extends BaseDataAdapter implements IDataAdapter {
    constructor(connectionOption: string);
    private getConnection;
    private closeConnection;
    authenticate(): Promise<void>;
    getDatabases(): Promise<SqluiCore.DatabaseMetaData[]>;
    getTables(database?: string): Promise<SqluiCore.TableMetaData[]>;
    getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]>;
    private createDatabase;
    execute(sql: string, database?: string): Promise<SqluiCore.Result>;
}
