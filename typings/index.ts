import { ColumnDescription } from 'sequelize';

export module Sqlui {
  export type AddConnectionProps = {
    connection: string;
    name: string;
    [index: string]: any;
  };

  export interface ConnectionProps {
    id: string;
    connection: string;
    name: string;
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
    columns: ColumnMetaData;
  };

  export type DatabaseMetaData = {
    name: string;
    tables: TableMetaData[];
  };

  export type ConnectionMetaData = ConnectionProps & DatabaseMetaData;

  export type RawData = Record<string, string | number | boolean>[];
  export type MetaData = Record<string, string | number | boolean>;

  export type Result = [RawData, MetaData];
}
