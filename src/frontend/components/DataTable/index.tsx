import Chip from "@mui/material/Chip";
import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import LegacyDataTable from "src/frontend/components/DataTable/LegacyDataTable";
import ModernDataTable from "src/frontend/components/DataTable/ModernDataTable";
import { DropdownButtonOption } from "src/frontend/components/DropdownButton";
import { useTableRenderer } from "src/frontend/hooks/useSetting";

/** Props shared by all DataTable implementations (Legacy and Modern). */
export type DataTableProps = {
  /** Column definitions for the table. */
  columns: any[];
  /** Row data to display in the table. */
  data: any[];
  /** Optional callback triggered on row double-click. */
  onRowClick?: (rowData: any) => void;
  /** Optional context menu options for each row. */
  rowContextOptions?: DropdownButtonOption[];
  /** Optional DOM ID for the global search input. */
  searchInputId?: string;
  /** Whether per-column filtering is enabled. */
  enableColumnFilter?: boolean;
};

/** Props for DataTableWithJSONList, which auto-generates columns from JSON data. */
export type DataTableWithJSONListProps = Omit<DataTableProps, "columns"> & {
  /** Whether the table should render in full-screen mode. */
  fullScreen?: boolean;
  /** Description used for data snapshot labeling. */
  description?: string;
};

/** Available page size options for table pagination. */
export const ALL_PAGE_SIZE_OPTIONS: any[] = [
  { label: "10", value: 10 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "Show All", value: -1 },
];

/** Default number of rows per page in the table. */
export const DEFAULT_TABLE_PAGE_SIZE = 50;

const UNNAMED_PROPERTY_NAME = "<unnamed_property>";

/**
 * A data table that auto-generates columns from a JSON array.
 * Dynamically infers column definitions from the data keys and renders values
 * with type-appropriate styling (chips for booleans/null, monospace for numbers).
 * Uses LegacyDataTable or ModernDataTable based on the table renderer setting.
 * @param props - Contains data array and optional table configuration.
 * @returns The rendered data table component.
 */
export function DataTableWithJSONList(props: DataTableWithJSONListProps) {
  const { data } = props;

  const tableRenderer = useTableRenderer();
  const isAdvancedTableRenderer = tableRenderer === "advanced";

  useMemo(() => {
    for (const value of data) {
      if (value !== null) {
        for (const columnValue of Object.values(value)) {
          if (typeof columnValue === "object" && columnValue !== null) {
            return true;
          }
        }
      }
    }

    return false;
  }, [data]);

  const columns: ColumnDef<any, any>[] = useMemo(() => {
    const newColumnNames = new Set<string>();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (typeof row === "object" && row !== null) {
        // is an object, then render as a list of properties
        for (const header of Object.keys(row)) {
          newColumnNames.add(header);
        }
      } else {
        // otherwise, render it as a column named `unknown`
        newColumnNames.add(UNNAMED_PROPERTY_NAME);
        data[i] = { UNNAMED_PROPERTY_NAME: row };
      }
    }

    return [...newColumnNames].map((columnName) => {
      return {
        header: columnName,
        enableSorting: true,
        enableColumnFilter: !!props.enableColumnFilter,
        accessorFn: (data: any) => {
          let columnValue = data[columnName];
          if (columnValue === null) {
            columnValue = "null";
          } else if (columnValue === undefined) {
            columnValue = "undefined";
          } else if (columnValue === true) {
            columnValue = "true";
          } else if (columnValue === false) {
            columnValue = "false";
          } else if (typeof columnValue === "object") {
            columnValue = JSON.stringify(columnValue);
          }

          const html = document.createElement("p");
          html.innerHTML = columnValue;
          return html.innerText;
        },
        cell: (info: any) => {
          const columnValue = info.row.original[columnName];
          if (columnValue === null) {
            return <Chip sx={{ textTransform: "uppercase", fontStyle: "italic" }} size="small" color="info" label="null" />;
          } else if (columnValue === undefined) {
            return <Chip sx={{ textTransform: "uppercase", fontStyle: "italic" }} size="small" color="default" label="undefined" />;
          } else if (columnValue === true || columnValue?.toString()?.toLowerCase() === "true") {
            return <Chip sx={{ textTransform: "uppercase", fontStyle: "italic" }} size="small" color="success" label="true" />;
          } else if (columnValue === false || columnValue?.toString()?.toLowerCase() === "false") {
            return <Chip sx={{ textTransform: "uppercase", fontStyle: "italic" }} size="small" color="error" label="false" />;
          } else if (typeof columnValue === "number") {
            return <span style={{ fontFamily: "monospace" }}>{columnValue}</span>;
          } else if (typeof columnValue === "object") {
            return (
              <span
                style={{
                  width: "100%",
                  display: "inline-block",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {JSON.stringify(columnValue)}
              </span>
            );
          }
          return (
            <span
              style={{
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                wordBreak: "break-all",
                whiteSpace: "nowrap",
                maxWidth: "fit-content",
              }}
            >
              {columnValue || ""}
            </span>
          );
        },
      };
    });
  }, [data]);

  if (isAdvancedTableRenderer) {
    // use the modern table
    return <ModernDataTable {...props} columns={columns} />;
  }

  // always use legacy table for now
  return <LegacyDataTable {...props} columns={columns} />;
}

export default LegacyDataTable;
