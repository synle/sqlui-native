import KeyIcon from "@mui/icons-material/Key";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import { useTheme } from "@mui/material/styles";
import React from "react";
import { AccordionHeader } from "src/frontend/components/Accordion";
import ColumnAttributes from "src/frontend/components/ColumnDescription/ColumnAttributes";
import ColumnName from "src/frontend/components/ColumnDescription/ColumnName";
import ColumnType from "src/frontend/components/ColumnDescription/ColumnType";
import ConnectionActions from "src/frontend/components/ConnectionActions";
import ConnectionRetryAlert from "src/frontend/components/ConnectionRetryAlert";
import ConnectionTypeIcon from "src/frontend/components/ConnectionTypeIcon";
import DatabaseActions from "src/frontend/components/DatabaseActions";
import TableActions from "src/frontend/components/TableActions";
import { getSanitizedConnectionUrl } from "src/frontend/utils/commonUtils";
import { TreeRow } from "./types";

/** Props for the TreeRowRenderer component. */
type TreeRowRendererProps = {
  /** The tree row data to render. */
  row: TreeRow;
  /** Callback to toggle expand/collapse of a tree node by key. */
  onToggle: (key: string, isVisible?: boolean) => void;
  /** Callback to reorder connections via drag-and-drop. */
  onConnectionOrderChange: (fromIdx: number, toIdx: number) => void;
};

/**
 * Renders a single row in the connection tree based on its type (connection, database, table, column, etc.).
 * @param props - Contains the row data, toggle handler, and connection reorder handler.
 * @returns The appropriate UI for the row type.
 */
export const TreeRowRenderer = React.memo(function TreeRowRenderer(props: TreeRowRendererProps) {
  const { row, onToggle, onConnectionOrderChange } = props;
  const theme = useTheme();

  switch (row.type) {
    case "connection-header": {
      const { connection, isSelected, isExpanded, visibilityKey, connectionIndex } = row;
      const sanitizedUrl = getSanitizedConnectionUrl(connection.connection);
      return (
        <AccordionHeader
          expanded={isExpanded}
          onToggle={() => onToggle(visibilityKey)}
          className={isSelected ? "selected ConnectionDescription" : "ConnectionDescription"}
          onOrderChange={onConnectionOrderChange}
          connectionIndex={connectionIndex}
        >
          <ConnectionTypeIcon dialect={connection.dialect} status={connection.status} />
          <span>
            {connection.name}
            {sanitizedUrl && (
              <Tooltip title={sanitizedUrl} placement="bottom-start">
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: theme.palette.text.disabled,
                  }}
                >
                  {sanitizedUrl}
                </span>
              </Tooltip>
            )}
          </span>
          <ConnectionActions connection={connection} />
        </AccordionHeader>
      );
    }

    case "connection-retry":
      return <ConnectionRetryAlert connectionId={row.connectionId} />;

    case "database-header": {
      const { connectionId, databaseName, isSelected, isExpanded, visibilityKey } = row;
      return (
        <AccordionHeader
          expanded={isExpanded}
          onToggle={() => onToggle(visibilityKey)}
          className={isSelected ? "selected DatabaseDescription" : "DatabaseDescription"}
        >
          <LibraryBooksIcon color="secondary" fontSize="inherit" />
          <span>{databaseName}</span>
          <DatabaseActions connectionId={connectionId} databaseId={databaseName} />
        </AccordionHeader>
      );
    }

    case "table-header": {
      const { connectionId, databaseId, tableName, isSelected, isExpanded, visibilityKey } = row;
      return (
        <div data-tree-key={visibilityKey}>
          <AccordionHeader
            expanded={isExpanded}
            onToggle={() => onToggle(visibilityKey)}
            className={isSelected ? "selected TableDescription" : "TableDescription"}
          >
            <TableRowsIcon color="success" fontSize="inherit" />
            <span>{tableName}</span>
            <TableActions connectionId={connectionId} databaseId={databaseId} tableId={tableName} />
          </AccordionHeader>
        </div>
      );
    }

    case "column-header": {
      const { column, isSelected, isExpanded, visibilityKey } = row;
      const shouldShowPrimaryKeyIcon = column.primaryKey || column.kind === "partition_key";
      const shouldShowSecondaryKeyIcon = column.kind === "clustering";
      const shouldShowForeignKeyIcon = column.kind === "foreign_key";

      return (
        <AccordionHeader
          expanded={isExpanded}
          onToggle={() => onToggle(visibilityKey)}
          className={isSelected ? "selected ColumnDescription" : "ColumnDescription"}
        >
          <ViewColumnIcon color="disabled" fontSize="inherit" />
          {shouldShowPrimaryKeyIcon && (
            <Tooltip title="Primary Key">
              <i style={{ height: "15px" }}>
                <KeyIcon fontSize="small" color="primary" />{" "}
              </i>
            </Tooltip>
          )}
          {shouldShowSecondaryKeyIcon && (
            <Tooltip title="Secondary Key / Clustering Key / Partition Key">
              <i style={{ height: "15px" }}>
                <KeyIcon fontSize="small" color="secondary" />{" "}
              </i>
            </Tooltip>
          )}
          {shouldShowForeignKeyIcon && (
            <Tooltip title={`Foreign Key referencing table=${column.referencedTableName} column=${column.referencedColumnName}`}>
              <i style={{ height: "15px" }}>
                <KeyIcon fontSize="small" color="secondary" />{" "}
              </i>
            </Tooltip>
          )}
          <ColumnName value={column.name} />
          <ColumnType value={column.type} />
        </AccordionHeader>
      );
    }

    case "column-attributes":
      return (
        <div className="ColumnAttributes__Wrapper">
          <ColumnAttributes column={row.column} />
        </div>
      );

    case "show-all-columns":
      return (
        <div className="ShowAllColumnsButton">
          <Button onClick={() => onToggle(row.showAllKey, true)}>Show All Columns</Button>
        </div>
      );

    case "loading":
      return (
        <Alert severity="info" icon={<CircularProgress size={15} />}>
          {row.message || "Loading..."}
        </Alert>
      );

    case "error":
      return <Alert severity="error">{row.message || "Error..."}</Alert>;

    case "empty":
      return <Alert severity="warning">{row.message || "Not Available"}</Alert>;

    default:
      return null;
  }
});
