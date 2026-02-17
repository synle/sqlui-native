import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useBlockLayout,
  useFilters,
  useGlobalFilter,
  usePagination,
  useResizeColumns,
  useSortBy,
  useTable,
} from 'react-table';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DataTableProps } from 'src/frontend/components/DataTable';
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

  const allRecordSize = data.length;
  const pageSizeToUse = allRecordSize;
  const { headerGroups, page, prepareRow, setGlobalFilter } = useTable(
    {
      initialState: {
        pageSize: pageSizeToUse,
      },
      columns,
      data,
      // @ts-ignore
      defaultColumn: {
        Filter: SimpleColumnFilter,
        width: tableCellWidthToUse,
      },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useBlockLayout,
    useResizeColumns,
  );

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
    count: page.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => tableCellHeight, []),
    overscan: 10,
  });

  const columnCount = headerGroups[0]?.headers.length ?? 0;
  const columnVirtualizer = useVirtualizer({
    count: columnCount,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => tableCellWidthToUse, [tableCellWidthToUse]),
    horizontal: true,
    overscan: 5,
  });

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

  useEffect(() => {
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
            <GlobalFilter id={props.searchInputId} onChange={setGlobalFilter} />
          )}
        </Box>
        {!fullScreen && (
          <Tooltip title='Open this table fullscreen in another window'>
            <IconButton aria-label='Make table bigger' onClick={onShowExpandedData}>
              <ZoomOutMapIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box
        ref={parentRef}
        className='DataTable__Header'
        sx={{
          maxHeight: tableHeight,
          overflow: 'auto',
        }}
        onContextMenu={(e) => onRowContextMenuClick(e)}>
        {/* Sticky header */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          {headerGroups.map((headerGroup) => (
            <StyledDivHeaderRow
              {...headerGroup.getHeaderGroupProps()}
              style={{
                ...headerGroup.getHeaderGroupProps().style,
                width: `${columnVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}>
              {virtualColumns.map((virtualColumn) => {
                const column = headerGroup.headers[virtualColumn.index];
                return (
                  <StyledDivHeaderCell
                    {...column.getHeaderProps()}
                    style={{
                      ...column.getHeaderProps().style,
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      transform: `translateX(${virtualColumn.start}px)`,
                      width: `${virtualColumn.size}px`,
                    }}>
                    <StyledDivHeaderCellLabel {...column.getSortByToggleProps()}>
                      <span>{column.render('Header')}</span>
                      {column.isSorted &&
                        (column.isSortedDesc ? (
                          <ArrowDropDownIcon fontSize='small' />
                        ) : (
                          <ArrowDropUpIcon fontSize='small' />
                        ))}
                    </StyledDivHeaderCellLabel>
                    {column.canFilter && column.Header && (
                      <Box sx={{ mt: 1 }}>{column.render('Filter')}</Box>
                    )}
                    {column.canResize && (
                      <ColumnResizer
                        {...column.getResizerProps()}
                        isResizing={column.isResizing}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      />
                    )}
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
            const row = page[rowIdx];
            prepareRow(row);

            return (
              <StyledDivContentRow
                ref={rowVirtualizer.measureElement}
                data-index={virtualItem.index}
                data-row-idx={rowIdx}
                sx={{
                  cursor: props.onRowClick ? 'pointer' : '',
                  transform: `translateY(${virtualItem.start}px)`,
                  width: `${columnVirtualizer.getTotalSize()}px`,
                  position: 'relative',
                }}
                onDoubleClick={() => props.onRowClick && props.onRowClick(row.original)}
                {...row.getRowProps()}>
                {virtualColumns.map((virtualColumn) => {
                  const colIdx = virtualColumn.index;
                  const cell = row.cells[colIdx];
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
                      {...cell.getCellProps()}
                      style={{
                        ...cell.getCellProps().style,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transform: `translateX(${virtualColumn.start}px)`,
                        width: `${virtualColumn.size}px`,
                      }}>
                      {dropdownContent}
                      {cell.render('Cell')}
                    </StyledDivValueCell>
                  );
                })}
              </StyledDivContentRow>
            );
          })}
        </StyledDivContainer>
        {page.length === 0 && (
          <Box sx={{ paddingInline: 2, paddingBlock: 2 }}>
            There is no data in the query with matching filters.
          </Box>
        )}
      </Box>
    </>
  );
}
