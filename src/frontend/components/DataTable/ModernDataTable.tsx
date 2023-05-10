import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import {
  useBlockLayout,
  useFilters,
  useGlobalFilter,
  usePagination,
  useResizeColumns,
  useSortBy,
  useTable,
} from 'react-table';
import React, { useCallback, useRef, useState } from 'react';
import { DataTableProps } from 'src/frontend/components/DataTable';
import { GlobalFilter, SimpleColumnFilter } from 'src/frontend/components/DataTable/Filter';
import DropdownMenu from 'src/frontend/components/DropdownMenu';
import { List, AutoSizer } from 'react-virtualized';


const defaultTableHeight = '450px';

const tableCellHeaderHeight = 75;

const tableCellHeight = 35;

const tableCellWidth = 300;

const StyledDivContainer = styled('div')(({ theme }) => ({}));

const StyledDivHeaderRow = styled('div')(({ theme }) => ({
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'nowrap',
  minWidth: '100%',
  position: 'sticky',
  top: 0,
  left: 0,
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  boxSizing: 'border-box',
  fontSize: '1 rem',

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
  userSelect: 'none',
  minWidth: '100%',
  backgroundColor: theme.palette.action.selected,
  boxSizing: 'border-box',
  fontSize: '0.95 rem',

  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.focus,
  },

  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StyledDivHeaderCell = styled('div')(({ theme }) => ({
  flexShrink: 0,
  height: `${tableCellHeight}px`,
  paddingInline: '0.5rem',
}));

const StyledDivHeaderCellLabel = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  '> span': {
    flexGrow: 1,
  },
}));

const StyledDivValueCell = styled('div')(({ theme }) => ({
  flexShrink: 0,
  height: `${tableCellHeight}px`,
  paddingInline: '0.5rem',
  display: 'flex',
  alignItems: 'center',
  paddingTop: '7px',
}));

const ColumnResizer = styled('div')(({ theme }) => ({
  background: theme.palette.text.primary,
  cursor: 'col-resize',
  userSelect: 'none',
  height: '100%',
  width: '8px',
  position: 'absolute',
  right: '0',
  top: '0',
  opacity: 0.05,
  '&:hover': {
    opacity: 1,
  },
}));

export default function ModernDataTable(props: DataTableProps): JSX.Element | null {
  const { columns, data } = props;
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

  const renderRow = (virtualItem) => {
    let rowIdx = virtualItem.index;
    const row = page[rowIdx];
    prepareRow(row);

    return (
      <StyledDivContentRow
        data-row-idx={rowIdx}
        sx={{
          cursor: props.onRowClick ? 'pointer' : '',
          height: tableCellHeight,
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
  }


  return (
    <>
      <Box sx={{ display: 'flex' }}>
        <Box sx={{ flexGrow: 1, mr: 2 }}>
          {props.searchInputId && (
            <GlobalFilter id={props.searchInputId} onChange={setGlobalFilter} />
          )}
        </Box>
      </Box>
        <StyledDivContainer
          sx={{
            height: `${tableCellHeight}px`,
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
                  {column.canFilter && <Box sx={{ mt: 1 }}>{column.render('Filter')}</Box>}
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
        </StyledDivContainer>

        <Box onContextMenu={(e) => onRowContextMenuClick(e)}>
          <AutoSizer>
            {
              ({ width, height }) => {
                const _height = tableCellHeight * data.length;

                return <List
                  width={width}
                  height={_height}
                  rowHeight={tableCellHeight}
                  rowRenderer={renderRow}
                  rowCount={data.length}
                  overscanRowCount={3} />
              }
            }
          </AutoSizer>
        </Box>

        {/*empty data*/}
        {!data ||
          (data.length === 0 && (
            <Box sx={{ paddingInline: 2, paddingBlock: 2 }}>
              There is no data in the query with matching filters.
            </Box>
          ))}
    </>
  );
}
