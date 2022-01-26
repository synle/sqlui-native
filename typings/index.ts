import { ColumnDescription } from 'sequelize';

export module Sqlui {
  export type CoreConnectionProps = {
    id?: string;
    connection: string;
    name: string;
    [index: string]: any;
  };

  export interface ConnectionProps {
    id: string;
    connection: string;
    name: string;
    status?: 'online' | 'offline';
    [index: string]: any;
  }

  export type Column = ColumnDescription & {
    [index: string]: any;
  };

  export type ColumnMetaData = {
    [index: string]: Column;
  };

  export type TableMetaData = {
    name: string;
    columns?: ColumnMetaData;
  };

  export type DatabaseMetaData = {
    name: string;
    tables: TableMetaData[];
  };

  export type CoreConnectionMetaData = CoreConnectionProps & {
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
}
