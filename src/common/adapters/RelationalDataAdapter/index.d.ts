import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';
export default class RelationalDataAdapter extends BaseDataAdapter implements IDataAdapter {
    dialect?: SqluiCore.Dialect;
    constructor(connectionOption: string);
    private getConnection;
    authenticate(): Promise<void>;
    getDatabases(): Promise<SqluiCore.DatabaseMetaData[]>;
    getTables(database?: string): Promise<SqluiCore.TableMetaData[]>;
    getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]>;
    execute(sql: string, database?: string): Promise<SqluiCore.Result>;
    private _execute;
}
