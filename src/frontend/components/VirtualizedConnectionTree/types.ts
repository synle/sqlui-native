import { SqluiCore } from 'typings';

export type ConnectionHeaderRow = {
  type: 'connection-header';
  key: string;
  depth: 0;
  visibilityKey: string;
  connection: SqluiCore.ConnectionProps;
  connectionIndex: number;
  isSelected: boolean;
  isExpanded: boolean;
};

export type ConnectionRetryRow = {
  type: 'connection-retry';
  key: string;
  depth: 1;
  connectionId: string;
};

export type DatabaseHeaderRow = {
  type: 'database-header';
  key: string;
  depth: 1;
  visibilityKey: string;
  connectionId: string;
  databaseName: string;
  isSelected: boolean;
  isExpanded: boolean;
};

export type TableHeaderRow = {
  type: 'table-header';
  key: string;
  depth: 2;
  visibilityKey: string;
  connectionId: string;
  databaseId: string;
  tableName: string;
  isSelected: boolean;
  isExpanded: boolean;
};

export type ColumnHeaderRow = {
  type: 'column-header';
  key: string;
  depth: 3;
  visibilityKey: string;
  connectionId: string;
  databaseId: string;
  tableId: string;
  column: SqluiCore.ColumnMetaData;
  isSelected: boolean;
  isExpanded: boolean;
};

export type ColumnAttributesRow = {
  type: 'column-attributes';
  key: string;
  depth: 4;
  column: SqluiCore.ColumnMetaData;
};

export type ShowAllColumnsRow = {
  type: 'show-all-columns';
  key: string;
  depth: 4;
  showAllKey: string;
};

export type LoadingRow = {
  type: 'loading';
  key: string;
  depth: number;
  message?: string;
};

export type ErrorRow = {
  type: 'error';
  key: string;
  depth: number;
  message?: string;
};

export type EmptyRow = {
  type: 'empty';
  key: string;
  depth: number;
  message?: string;
};

export type TreeRow =
  | ConnectionHeaderRow
  | ConnectionRetryRow
  | DatabaseHeaderRow
  | TableHeaderRow
  | ColumnHeaderRow
  | ColumnAttributesRow
  | ShowAllColumnsRow
  | LoadingRow
  | ErrorRow
  | EmptyRow;
