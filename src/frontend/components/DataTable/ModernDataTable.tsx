import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFacetedUniqueValues,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { ColumnOrderState, VisibilityState } from '@tanstack/react-table';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { DataTableProps } from 'src/frontend/components/DataTable';
import DataTableColumnSettings from 'src/frontend/components/DataTable/DataTableColumnSettings';
import {
  ColumnResizer,
  defaultTableHeight,
  StyledDivContainer,
  StyledDivContentRowForVirualized as StyledDivContentRow,
  StyledDivHeaderCellForVirtualized as StyledDivHeaderCell,
  StyledDivHeaderCellLabel,
  StyledDivHeaderRow,
  StyledDivValueCellForVirtualized as StyledDivValueCell,
  tableCellHeaderHeight,
  tableCellHeight,
  tableCellWidth,
} from 'src/frontend/components/DataTable/DataTableComponents';
import { GlobalFilter, SimpleColumnFilter } from 'src/frontend/components/DataTable/Filter';
import DropdownMenu from 'src/frontend/components/DropdownMenu';
import { useAddDataSnapshot } from 'src/frontend/hooks/useDataSnapshot';

export default function ModernDataTable(props: DataTableProps): JSX.Element | null {
  const { columns, data } = props;
  //@ts-ignore
  const fullScreen = props.fullScreen === true;
  //@ts-ignore
  const description = props.description || `Data Snapshot - ${new Date()}`;
  const { mutateAsync: addDataSnapshot } = useAddDataSnapshot();
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [openContextMenuRowIdx, setOpenContextMenuRowIdx] = useState(-1);
  const [tableHeight, setTableHeight] = useState(defaultTableHeight);
  const anchorEl = useRef<HTMLElement | null>(null);

  // figure out the width
  let tableCellWidthToUse = tableCellWidth;
  // @ts-ignore
  const totalWidth = document.querySelector('.LayoutTwoColumns__RightPane')?.offsetWidth - 20 || 0;
  if (columns.length > 0 && columns.length * tableCellWidth < totalWidth) {
    tableCellWidthToUse = Math.floor(totalWidth / columns.length);
  }

  const table = useReactTable({
    columns: columns as ColumnDef<any, any>[],
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
    columnResizeMode: 'onChange',
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

  const onRowContextMenuClick = (e: React.SyntheticEvent) => {
    const target = e.target as HTMLElement;
    const tr = target.closest('[role=row]') as HTMLElement;
    const rowIdx = parseInt(tr?.dataset?.rowIdx || '');

    if (rowIdx >= 0) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      setOpenContextMenuRowIdx(rowIdx);
      anchorEl.current = target;
    }
  };

  const targetRowContextOptions = (props.rowContextOptions || []).map((rowContextOption) => ({
    ...rowContextOption,
    onClick: () =>
      rowContextOption.onClick && rowContextOption.onClick(data[openContextMenuRowIdx]),
  }));

  // The scrollable element for the list
  const parentRef = useRef<HTMLDivElement | null>(null);

  // The virtualizers
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => tableCellHeight, []),
    overscan: 10,
  });

  const headerGroups = table.getHeaderGroups();
  const headerColumns = headerGroups[0]?.headers ?? [];
  const columnCount = headerColumns.length;
  const columnSizingInfo = table.getState().columnSizingInfo;
  const columnVirtualizer = useVirtualizer({
    count: columnCount,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => headerColumns[index]?.getSize() || tableCellWidthToUse,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [columnSizingInfo, tableCellWidthToUse],
    ),
    horizontal: true,
    overscan: 5,
  });

  useLayoutEffect(() => {
    columnVirtualizer.measure();
  }, [columnSizingInfo, columnVirtualizer]);

  const onShowExpandedData = async () => {
    try {
      const dataSnapshot = await addDataSnapshot({
        values: data,
        description,
      });

      if (dataSnapshot?.id) {
        window.openAppLink(`/data_snapshot/${dataSnapshot.id}`);
      }
    } finally {
    }
  };

  useLayoutEffect(() => {
    if (!fullScreen) {
      return;
    }

    function _updateHeight() {
      function findOffsetRelativeToAncestor(element: HTMLElement | null, ancestor: HTMLElement) {
        let offset = 0;
        let currentElement = element;

        while (currentElement && currentElement !== ancestor) {
          offset += currentElement.offsetTop;
          currentElement = currentElement.offsetParent as HTMLElement;
        }

        return offset;
      }

      const element = document.querySelector('.DataTable__Header') as HTMLElement;
      const ancestor = document.body;

      const yOffset = findOffsetRelativeToAncestor(element, ancestor);
      const newHeight = window.innerHeight - yOffset;

      setTableHeight(newHeight + 'px');
    }

    _updateHeight();

    window.addEventListener('resize', _updateHeight);

    return () => {
      window.removeEventListener('resize', _updateHeight);
    };
  }, [fullScreen]);

  const virtualItems = rowVirtualizer.getVirtualItems();
  const virtualColumns = columnVirtualizer.getVirtualItems();

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          {props.searchInputId && (
            <GlobalFilter id={props.searchInputId} onChange={(value: string) => table.setGlobalFilter(value)} />
          )}
        </Box>
        <DataTableColumnSettings table={table} />
        <Tooltip title='Open this table fullscreen in another window'>
          <IconButton aria-label='Make table bigger' onClick={onShowExpandedData}>
            <ZoomOutMapIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        ref={parentRef}
        className='DataTable__Header'
        sx={{
          minHeight: '150px',
          maxHeight: tableHeight,
          overflow: 'auto',
        }}
        onContextMenu={(e) => onRowContextMenuClick(e)}>
        {/* Sticky header */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: (theme) => theme.zIndex.drawer + 1, height: tableCellHeaderHeight }}>
          {headerGroups.map((headerGroup) => (
            <StyledDivHeaderRow
              key={headerGroup.id}
              role='row'
              style={{
                display: 'flex',
                width: `${columnVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}>
              {virtualColumns.map((virtualColumn) => {
                const header = headerGroup.headers[virtualColumn.index];
                return (
                  <StyledDivHeaderCell
                    key={header.id}
                    role='columnheader'
                    style={{
                      display: 'inline-block',
                      width: `${virtualColumn.size}px`,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transform: `translateX(${virtualColumn.start}px)`,
                    }}>
                    <StyledDivHeaderCellLabel
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}>
                      <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      {header.column.getIsSorted() === 'desc' ? (
                        <ArrowDropDownIcon fontSize='small' />
                      ) : header.column.getIsSorted() === 'asc' ? (
                        <ArrowDropUpIcon fontSize='small' />
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
                );
              })}
            </StyledDivHeaderRow>
          ))}
        </Box>
        {/* Virtualized rows */}
        <StyledDivContainer
          sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: `${columnVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}>
          {virtualItems.map((virtualItem) => {
            const rowIdx = virtualItem.index;
            const row = rows[rowIdx];

            return (
              <StyledDivContentRow
                key={row.id}
                data-index={virtualItem.index}
                data-row-idx={rowIdx}
                role='row'
                sx={{
                  cursor: props.onRowClick ? 'pointer' : '',
                  transform: `translateY(${virtualItem.start}px)`,
                  width: `${columnVirtualizer.getTotalSize()}px`,
                  height: `${tableCellHeight}px`,
                }}
                onDoubleClick={() => props.onRowClick && props.onRowClick(row.original)}>
                {virtualColumns.map((virtualColumn) => {
                  const colIdx = virtualColumn.index;
                  const cell = row.getVisibleCells()[colIdx];
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
                        maxHeight='400px'
                        anchorEl={anchorEl}
                        open={openContextMenuRowIdx === rowIdx}
                      />
                    );
                  }
                  return (
                    <StyledDivValueCell
                      key={cell.id}
                      role='cell'
                      style={{
                        display: 'inline-block',
                        width: `${virtualColumn.size}px`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transform: `translateX(${virtualColumn.start}px)`,
                      }}>
                      {dropdownContent}
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </StyledDivValueCell>
                  );
                })}
              </StyledDivContentRow>
            );
          })}
        </StyledDivContainer>
        {rows.length === 0 && (
          <Box sx={{ paddingInline: 2, paddingBlock: 2 }}>
            There is no data in the query with matching filters.
          </Box>
        )}
      </Box>
    </>
  );
}
