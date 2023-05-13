import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
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
import React, { useEffect, useRef, useState } from 'react';
import { DataTableProps } from 'src/frontend/components/DataTable';
import { GlobalFilter, SimpleColumnFilter } from 'src/frontend/components/DataTable/Filter';
import DropdownMenu from 'src/frontend/components/DropdownMenu';
import { useAddDataSnapshot } from 'src/frontend/hooks/useDataSnapshot';

import {ColumnResizer, defaultTableHeight,
tableCellHeaderHeight,
tableCellHeight,
StyledDivValueCellForVirtualized as StyledDivValueCell,
StyledDivContainer,
StyledDivHeaderCellForVirtualized as StyledDivHeaderCell,
StyledDivHeaderCellLabel,
StyledDivHeaderRow,
StyledDivContentRowForVirualized as StyledDivContentRow,
tableCellWidth,}  from 'src/frontend/components/DataTable/DataTableComponents';

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
  if (columns.length * tableCellWidth < totalWidth) {
    tableCellWidthToUse = Math.floor(totalWidth / columns.length);
  }

  const allRecordSize = data.length;
  const pageSizeToUse = allRecordSize;
  const {
    headerGroups,
    page,
    prepareRow,
    setGlobalFilter,
  } = useTable(
    {
      initialState: {
        pageSize: pageSizeToUse,
      },
      columns,
      data,
      // @ts-ignore
      defaultColumn: {
        Filter: SimpleColumnFilter,
        width: tableCellWidthToUse, // set default width for all columns
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
  // The scrollable element for your list
  const parentRef = React.useRef<HTMLTableElement | null>(null);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: page.length,
    paddingStart: tableCellHeaderHeight,
    getScrollElement: () => parentRef.current,
    estimateSize: (rowIdx) => tableCellHeight,
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
      function findOffsetRelativeToAncestor(element, ancestor) {
        let offset = 0;
        let currentElement = element;

        while (currentElement && currentElement !== ancestor) {
          offset += currentElement.offsetTop;
          currentElement = currentElement.offsetParent;
        }

        return offset;
      }

      var element = document.querySelector('.DataTable__Header');
      var ancestor = document.body;

      var yOffset = findOffsetRelativeToAncestor(element, ancestor);
      var newHeight = window.innerHeight - yOffset;

      setTableHeight(newHeight + 'px');
    }

    _updateHeight();

    window.addEventListener('resize', _updateHeight);

    return () => {
      window.removeEventListener('resize', _updateHeight);
    };
  }, [fullScreen]);

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
        sx={{
          maxHeight: tableHeight,
          overflow: 'auto', // Make it scroll!
        }}
        onContextMenu={(e) => onRowContextMenuClick(e)}>
        <StyledDivContainer
          className='DataTable__Header'
          sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}>
          {headerGroups.map((headerGroup, headerGroupIdx) => (
            <StyledDivHeaderRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column, colIdx) => (
                <StyledDivHeaderCell {...column.getHeaderProps()}>
                  <StyledDivHeaderCellLabel {...column.getSortByToggleProps()}>
                    <span>{column.render('Header')}</span>
                    {column.isSorted &&
                      (column.isSortedDesc ? (
                        <ArrowDropDownIcon fontSize='small' />
                      ) : (
                        <ArrowDropUpIcon fontSize='small' />
                      ))}
                    {/* Render the column resize handler */}
                  </StyledDivHeaderCellLabel>
                  {column.canFilter && column.Header && <Box sx={{ mt: 1 }}>{column.render('Filter')}</Box>}
                  {column.canResize && (
                    <ColumnResizer
                      {...column.getResizerProps()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    />
                  )}
                </StyledDivHeaderCell>
              ))}
            </StyledDivHeaderRow>
          ))}
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            let rowIdx = virtualItem.index;
            const row = page[rowIdx];
            //@ts-ignore
            const measureRef = virtualItem.measureRef;
            prepareRow(row);

            return (
              <StyledDivContentRow
                ref={measureRef}
                data-row-idx={rowIdx}
                sx={{
                  cursor: props.onRowClick ? 'pointer' : '',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                onDoubleClick={() => props.onRowClick && props.onRowClick(row.original)}
                {...row.getRowProps()}>
                {row.cells.map((cell, colIdx) => {
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
                    <StyledDivValueCell {...cell.getCellProps()}>
                      {dropdownContent}
                      {cell.render('Cell')}
                    </StyledDivValueCell>
                  );
                })}
              </StyledDivContentRow>
            );
          })}
        </StyledDivContainer>
        {!page ||
          (page.length === 0 && (
            <Box sx={{ paddingInline: 2, paddingBlock: 2 }}>
              There is no data in the query with matching filters.
            </Box>
          ))}
      </Box>
    </>
  );
}

