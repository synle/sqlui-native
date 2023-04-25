import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFilters, useGlobalFilter, usePagination, useSortBy, useTable } from 'react-table';
import React, { useCallback, useRef, useState } from 'react';
import { DataTableProps } from 'src/frontend/components/DataTable';
import { GlobalFilter, SimpleColumnFilter } from 'src/frontend/components/DataTable/Filter';
import DropdownMenu from 'src/frontend/components/DropdownMenu';

const tableHeight = '400px';

const tableCellHeaderHeight = 75;

const tableCellHeight = 35;

const tableCellWidth = 200;

const StyledDivContainer = styled('div')(({ theme }) => ({}));

const StyledDivHeaderRow = styled('div')(({ theme }) => ({
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  fontSize: '1rem',
  flexWrap: 'nowrap',
  minWidth: '100%',
  position: 'sticky',
  top: 0,
  left: 0,
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,

  '> div': {
    height: `${tableCellHeaderHeight}px`,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    paddingTop: '5px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-all',
    whiteSpace: 'nowrap',
  },
}));

const StyledDivContentRow = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.9rem',
  userSelect: 'none',
  minWidth: '100%',
  backgroundColor: theme.palette.action.selected,

  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },

  '&:hover': {
    backgroundColor: theme.palette.action.focus,
  },
}));

const StyledDivContentCell = styled('div')(({ theme }) => ({
  flexShrink: 0,
  maxWidth: `200px`,
  paddingInline: '0.5rem',
}));

const StyledDivContentCellLabel = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  '> span': {
    flexGrow: 1,
  },
}));

export default function ModernDataTable(props: DataTableProps): JSX.Element | null {
  const { columns, data } = props;
  const [openContextMenuRowIdx, setOpenContextMenuRowIdx] = useState(-1);
  const anchorEl = useRef<HTMLElement | null>(null);

  const allRecordSize = data.length;
  const pageSizeToUse = allRecordSize;
  const {
    getTableBodyProps,
    gotoPage,
    headerGroups,
    page,
    prepareRow,
    setGlobalFilter,
    setPageSize,
    state,
  } = useTable(
    {
      initialState: {
        pageSize: pageSizeToUse,
      },
      columns,
      data,
      // @ts-ignore
      defaultColumn: { Filter: SimpleColumnFilter },
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
  );
  const { pageIndex, pageSize } = state;

  const onPageChange = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | null, page: number) => {
      gotoPage(page);
    },
    [],
  );

  const onRowsPerPageChange = useCallback((e) => {
    setPageSize(e.target.value);
  }, []);

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

  // figure out the width
  const headers = headerGroups?.[0]?.headers || [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    columns[i].width = Math.max(header.width as number, tableCellWidth);
    columns[i].width = `${columns[i].width}px`;
  }

  // The scrollable element for your list
  const parentRef = React.useRef<HTMLTableElement | null>(null);

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: page.length,
    paddingStart: tableCellHeaderHeight,
    getScrollElement: () => parentRef.current,
    estimateSize: () => tableCellHeight,
    overscan: 5,
  });

  return (
    <>
      {props.searchInputId && <GlobalFilter id={props.searchInputId} onChange={setGlobalFilter} />}
      <Box
        ref={parentRef}
        sx={{
          maxHeight: tableHeight,
          overflow: 'auto', // Make it scroll!
        }}
        onContextMenu={(e) => onRowContextMenuClick(e)}>
        <StyledDivContainer
          sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}>
          {headerGroups.map((headerGroup, headerGroupIdx) => (
            <StyledDivHeaderRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column, colIdx) => (
                <StyledDivContentCell
                  sx={{
                    width: columns[colIdx].width,
                  }}
                  {...column.getHeaderProps()}>
                  <StyledDivContentCellLabel {...column.getSortByToggleProps()}>
                    <span>{column.render('Header')}</span>
                    {column.isSorted &&
                      (column.isSortedDesc ? (
                        <ArrowDropDownIcon fontSize='small' />
                      ) : (
                        <ArrowDropUpIcon fontSize='small' />
                      ))}
                  </StyledDivContentCellLabel>
                  {column.canFilter && <Box sx={{ mt: 1 }}>{column.render('Filter')}</Box>}
                </StyledDivContentCell>
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
                    <StyledDivContentCell
                      sx={{
                        width: columns[colIdx].width,
                      }}
                      {...cell.getCellProps()}>
                      {dropdownContent}
                      {cell.render('Cell')}
                    </StyledDivContentCell>
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