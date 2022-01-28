import { ColumnDescription } from 'sequelize';

export module Sqlui {
  export type Dialect = 'mysql' | 'mssql' | 'postgres' | 'sqlite' | string;

  export type CoreConnectionProps = {
    connection: string;
    name: string;
    status?: 'online' | 'offline';
    [index: string]: any;
  };

  export type ConnectionProps = CoreConnectionProps & {
    id: string;
  };

  export type ColumnMetaData = ColumnDescription & {
    name: string;
    [index: string]: any;
  };

  export type TableMetaData = {
    name: string;
    columns: ColumnMetaData[];
  };

  export type DatabaseMetaData = {
    name: string;
    tables: TableMetaData[];
  };

  export type CoreConnectionMetaData = CoreConnectionProps & {
    dialect?: Sqlui.Dialect;
    databases: DatabaseMetaData[];
  };

  export type ConnectionMetaData = CoreConnectionMetaData & ConnectionProps;

  export type RawData = Record<string, string | number | boolean>[];
  export type MetaData = Record<string, string | number | boolean>;

  export type Result = [RawData, MetaData];
}

export module SqluiNative {
  // connection queries
  export interface ConnectionQuery {
    id: string;
    name: string;
    connectionId?: string;
    databaseId?: string;
    sql: string;
    lastExecuted?: string;
    selected: boolean;
  }

  export interface AvailableConnectionProps {
    connectionId: string;
    databaseId: string;
    id: string;
    label: string;
  }
}
