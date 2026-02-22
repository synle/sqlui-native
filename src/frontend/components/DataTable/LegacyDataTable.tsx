import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFacetedUniqueValues,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { ColumnOrderState, VisibilityState } from "@tanstack/react-table";
import React, { useLayoutEffect, useRef, useState } from "react";
import { DataTableProps } from "src/frontend/components/DataTable";
import DataTableColumnSettings from "src/frontend/components/DataTable/DataTableColumnSettings";
import {
  ColumnResizer,
  StyledDivContentRow,
  StyledDivHeaderCell,
  StyledDivHeaderCellLabel,
  StyledDivHeaderRow,
  StyledDivValueCell,
  tableCellWidth,
} from "src/frontend/components/DataTable/DataTableComponents";
import { GlobalFilter, SimpleColumnFilter } from "src/frontend/components/DataTable/Filter";
import DropdownMenu from "src/frontend/components/DropdownMenu";
import { useAddDataSnapshot } from "src/frontend/hooks/useDataSnapshot";

export default function LegacyDataTable(props: DataTableProps): JSX.Element | null {
  const { data } = props;
  const [columns, setColumns] = useState<ColumnDef<any, any>[]>([]);
  useLayoutEffect(() => {
    let newColumns = props.columns as ColumnDef<any, any>[];

    // get the client width, then see if we need to subtract the left pane
    let widthToUse = document.querySelector(".LayoutTwoColumns__LeftPane")?.clientWidth || 0;
    if (widthToUse > 0) {
      widthToUse += 30;
    }
    widthToUse = window.innerWidth - widthToUse;

    let columnsToSize = newColumns.length;
    for (const column of newColumns) {
      if (column.size) {
        columnsToSize--;
        widthToUse -= column.size;
      }
    }

    widthToUse = Math.max(Math.floor(widthToUse / columnsToSize), tableCellWidth);

    newColumns = newColumns.map((column) => {
      return {
        ...column,
        size: column.size || widthToUse,
      };
    });

    setColumns(newColumns);
  }, [props.columns]);
  //@ts-ignore
  const description = props.description || `Data Snapshot - ${new Date()}`;
  const { mutateAsync: addDataSnapshot } = useAddDataSnapshot();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [openContextMenuRowIdx, setOpenContextMenuRowIdx] = useState(-1);
  const anchorEl = useRef<HTMLElement | null>(null);

  // figure out the width
  let tableCellWidthToUse = tableCellWidth;

  const totalWidth = (document.querySelector(".LayoutTwoColumns__RightPane") as HTMLElement)?.offsetWidth - 20 || 0;
  if (columns.length * tableCellWidth < totalWidth) {
    tableCellWidthToUse = Math.floor(totalWidth / columns.length);
  }

  const table = useReactTable({
    columns,
    data,
    defaultColumn: {
      size: tableCellWidthToUse,
      enableColumnFilter: true,
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    columnResizeMode: "onChange",
    state: {
      columnVisibility,
      columnOrder,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    initialState: {
      pagination: {
        pageSize: data.length,
      },
    },
  });

  const rows = table.getRowModel().rows;
  const headerGroups = table.getHeaderGroups();

  const onRowContextMenuClick = (e: React.SyntheticEvent) => {
    const target = e.target as HTMLElement;
    const tr = target.closest("[role=row]") as HTMLElement;
    const rowIdx = parseInt(tr?.dataset?.rowIdx || "");

    if (rowIdx >= 0) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      setOpenContextMenuRowIdx(rowIdx);
      anchorEl.current = target;
    }
  };

  const targetRowContextOptions = (props.rowContextOptions || []).map((rowContextOption) => ({
    ...rowContextOption,
    onClick: () => rowContextOption.onClick && rowContextOption.onClick(data[openContextMenuRowIdx]),
  }));

  const onShowExpandedData = async () => {
    try {
      const dataSnapshot = await addDataSnapshot({
        values: data,
        description,
      });

      if (dataSnapshot?.id) {
        window.openAppLink(`/data_snapshot/${dataSnapshot.id}`);
      }
    }
  };
  return (
    <>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          {props.searchInputId && <GlobalFilter id={props.searchInputId} onChange={(value: string) => table.setGlobalFilter(value)} />}
        </Box>
        <DataTableColumnSettings table={table} />
        <Tooltip title="Open this table fullscreen in another window">
          <IconButton aria-label="Make table bigger" onClick={onShowExpandedData}>
            <ZoomOutMapIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ position: "relative" }} onContextMenu={(e) => onRowContextMenuClick(e)}>
        {headerGroups.map((headerGroup) => (
          <StyledDivHeaderRow key={headerGroup.id} role="row" style={{ display: "flex" }}>
            {headerGroup.headers.map((header) => (
              <StyledDivHeaderCell
                key={header.id}
                role="columnheader"
                style={{
                  display: "inline-block",
                  width: `${header.getSize()}px`,
                }}
              >
                <StyledDivHeaderCellLabel
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}
                >
                  <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                  {header.column.getIsSorted() === "desc" ? (
                    <ArrowDropDownIcon fontSize="small" />
                  ) : header.column.getIsSorted() === "asc" ? (
                    <ArrowDropUpIcon fontSize="small" />
                  ) : null}
                </StyledDivHeaderCellLabel>
                {header.column.getCanFilter() && header.column.columnDef.header && (
                  <Box sx={{ mt: 1 }}>
                    <SimpleColumnFilter column={header.column} />
                  </Box>
                )}
                <ColumnResizer
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                  isResizing={header.column.getIsResizing()}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                />
              </StyledDivHeaderCell>
            ))}
          </StyledDivHeaderRow>
        ))}
        {rows.map((row, rowIdx) => {
          return (
            <StyledDivContentRow
              key={row.id}
              data-row-idx={rowIdx}
              role="row"
              style={{ display: "flex" }}
              sx={{
                cursor: props.onRowClick ? "pointer" : "",
              }}
              onDoubleClick={() => props.onRowClick && props.onRowClick(row.original)}
            >
              {row.getVisibleCells().map((cell, colIdx) => {
                let dropdownContent: any;
                if (colIdx === 0 && targetRowContextOptions.length > 0) {
                  dropdownContent = (
                    <DropdownMenu
                      id={`data-table-row-dropdown-${rowIdx}`}
                      options={targetRowContextOptions}
                      onToggle={(newOpen) => {
                        if (newOpen) {
                          setOpenContextMenuRowIdx(rowIdx);
                        } else {
                          setOpenContextMenuRowIdx(-1);
                        }
                      }}
                      maxHeight="400px"
                      anchorEl={anchorEl}
                      open={openContextMenuRowIdx === rowIdx}
                    />
                  );
                }
                return (
                  <StyledDivValueCell
                    key={cell.id}
                    role="cell"
                    style={{
                      display: "inline-block",
                      width: `${cell.column.getSize()}px`,
                    }}
                  >
                    {dropdownContent}
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </StyledDivValueCell>
                );
              })}
            </StyledDivContentRow>
          );
        })}
        {rows.length === 0 && <Box sx={{ paddingInline: 2, paddingBlock: 2 }}>There is no data in the query with matching filters.</Box>}
      </Box>
    </>
  );
}
