import KeyIcon from "@mui/icons-material/Key";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import { AccordionHeader } from "src/frontend/components/Accordion";
import ColumnAttributes from "src/frontend/components/ColumnDescription/ColumnAttributes";
import ColumnName from "src/frontend/components/ColumnDescription/ColumnName";
import ColumnType from "src/frontend/components/ColumnDescription/ColumnType";
import ConnectionActions from "src/frontend/components/ConnectionActions";
import ConnectionRetryAlert from "src/frontend/components/ConnectionRetryAlert";
import ConnectionTypeIcon from "src/frontend/components/ConnectionTypeIcon";
import DatabaseActions from "src/frontend/components/DatabaseActions";
import TableActions from "src/frontend/components/TableActions";
import { TreeRow } from "./types";

type TreeRowRendererProps = {
  row: TreeRow;
  onToggle: (key: string, isVisible?: boolean) => void;
  onConnectionOrderChange: (fromIdx: number, toIdx: number) => void;
};

export function TreeRowRenderer(props: TreeRowRendererProps) {
  const { row, onToggle, onConnectionOrderChange } = props;

  switch (row.type) {
    case "connection-header": {
      const { connection, isSelected, isExpanded, visibilityKey, connectionIndex } = row;
      return (
        <AccordionHeader
          expanded={isExpanded}
          onToggle={() => onToggle(visibilityKey)}
          className={isSelected ? "selected ConnectionDescription" : "ConnectionDescription"}
          onOrderChange={onConnectionOrderChange}
          connectionIndex={connectionIndex}
        >
          <ConnectionTypeIcon dialect={connection.dialect} status={connection.status} />
          <span>{connection.name}</span>
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
        <AccordionHeader
          expanded={isExpanded}
          onToggle={() => onToggle(visibilityKey)}
          className={isSelected ? "selected TableDescription" : "TableDescription"}
        >
          <TableRowsIcon color="success" fontSize="inherit" />
          <span>{tableName}</span>
          <TableActions connectionId={connectionId} databaseId={databaseId} tableId={tableName} />
        </AccordionHeader>
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
}
