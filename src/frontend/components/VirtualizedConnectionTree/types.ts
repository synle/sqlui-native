import { SqluiCore } from "typings";

/** Row representing a connection header in the tree. */
export type ConnectionHeaderRow = {
  type: "connection-header";
  key: string;
  depth: 0;
  visibilityKey: string;
  connection: SqluiCore.ConnectionProps;
  connectionIndex: number;
  isSelected: boolean;
  isExpanded: boolean;
};

/** Row showing a retry prompt for an offline connection. */
export type ConnectionRetryRow = {
  type: "connection-retry";
  key: string;
  depth: 1;
  connectionId: string;
};

/** Row representing a database header in the tree. */
export type DatabaseHeaderRow = {
  type: "database-header";
  key: string;
  depth: 1;
  visibilityKey: string;
  connectionId: string;
  databaseName: string;
  isSelected: boolean;
  isExpanded: boolean;
};

/** Row representing a table header in the tree. */
export type TableHeaderRow = {
  type: "table-header";
  key: string;
  depth: 2;
  visibilityKey: string;
  connectionId: string;
  databaseId: string;
  tableName: string;
  isSelected: boolean;
  isExpanded: boolean;
};

/** Row representing a column header in the tree. */
export type ColumnHeaderRow = {
  type: "column-header";
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

/** Row displaying expanded column attribute details. */
export type ColumnAttributesRow = {
  type: "column-attributes";
  key: string;
  depth: 4;
  column: SqluiCore.ColumnMetaData;
};

/** Row with a button to reveal all columns when the list is truncated. */
export type ShowAllColumnsRow = {
  type: "show-all-columns";
  key: string;
  depth: 4;
  showAllKey: string;
};

/** Row displaying a loading indicator. */
export type LoadingRow = {
  type: "loading";
  key: string;
  depth: number;
  message?: string;
};

/** Row displaying an error message. */
export type ErrorRow = {
  type: "error";
  key: string;
  depth: number;
  message?: string;
};

/** Row displaying an empty/not-available message. */
export type EmptyRow = {
  type: "empty";
  key: string;
  depth: number;
  message?: string;
};

/** Union type of all possible tree row types in the connection tree. */
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
