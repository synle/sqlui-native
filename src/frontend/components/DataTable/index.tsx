import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TextField from '@mui/material/TextField';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFilters, useGlobalFilter, usePagination, useSortBy, useTable } from 'react-table';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { DropdownButtonOption } from 'src/frontend/components/DropdownButton';
import DropdownMenu from 'src/frontend/components/DropdownMenu';
import { useTablePageSize } from 'src/frontend/hooks/useSetting';
import { sortColumnNamesForUnknownData } from 'src/frontend/utils/commonUtils';
import Chip from '@mui/material/Chip';

type DataTableProps = {
  columns: any[];
  data: any[];
  onRowClick?: (rowData: any) => void;
  rowContextOptions?: DropdownButtonOption[];
  searchInputId?: string;
  enableColumnFilter?: boolean;
};

export const ALL_PAGE_SIZE_OPTIONS: any[] = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: 'Show All', value: -1 },
];

export const DEFAULT_TABLE_PAGE_SIZE = 50;

const UNNAMED_PROPERTY_NAME = '<unnamed_property>';

const tableHeight = '500px';

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
  backgroundColor: theme.palette.common.black,
  color: theme.palette.common.white,
  borderBottom: `1px solid ${theme.palette.divider}`,

  '> div': {
    height: `${tableCellHeaderHeight}px`,
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
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
// default filter (using text)
type SimpleColumnFilterProps = {
  column: {
    filterValue?: string;
    setFilter: (newFilterValue: string | undefined) => void;
  };
};

export function SimpleColumnFilter({
  column: { filterValue, setFilter },
}: SimpleColumnFilterProps) {
  return (
    <TextField
      size='small'
      placeholder='Filter'
      value={filterValue || ''}
      onChange={(e) => setFilter(e.target.value || undefined)}
    />
  );
}

export default function DataTable(props: DataTableProps): JSX.Element | null {
  const { columns, data } = props;
  const [openContextMenuRowIdx, setOpenContextMenuRowIdx] = useState(-1);
  const anchorEl = useRef<HTMLElement | null>(null);

  const allRecordSize = data.length;
  let pageSizeToUse = useTablePageSize() || DEFAULT_TABLE_PAGE_SIZE;
  if (pageSizeToUse === -1) {
    pageSizeToUse = allRecordSize;
  }
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
      {props.searchInputId && (
        <TextField
          id={props.searchInputId}
          label='Search Table'
          size='small'
          variant='standard'
          sx={{ mb: 2 }}
          fullWidth
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
      )}
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
                  style={{
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
            prepareRow(row);

            return (
              <StyledDivContentRow
                onDoubleClick={() => props.onRowClick && props.onRowClick(row.original)}
                style={{
                  cursor: props.onRowClick ? 'pointer' : '',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                data-row-idx={rowIdx}
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
                      style={{
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

export function DataTableWithJSONList(props: Omit<DataTableProps, 'columns'>) {
  const { data } = props;

  const columns = useMemo(() => {
    const newColumnNames = new Set<string>();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (typeof row === 'object') {
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

    return sortColumnNamesForUnknownData([...newColumnNames]).map((columnName) => {
      return {
        Header: columnName,
        sortable: true,
        disableFilters: !props.enableColumnFilter,
        accessor: (data: any) => {
          let columnValue = data[columnName];
          if (columnValue === null) {
            columnValue = 'null';
          } else if (columnValue === undefined) {
            columnValue = 'undefined';
          } else if (columnValue === true) {
            columnValue = 'true';
          } else if (columnValue === false) {
            columnValue = 'false';
          }

          const html = document.createElement('p');
          html.innerHTML = columnValue;
          return html.innerText;
        },
        Cell: (data: any, a, b, c) => {
          const columnValue = data.row.original[columnName];
          if (columnValue === null) {
            return <Chip sx={{ textTransform: 'uppercase', fontStyle: 'italic' }} size='small' color='warning' label='null' />;
          } else if (columnValue === undefined) {
            return <Chip sx={{ textTransform: 'uppercase', fontStyle: 'italic' }} size='small' color='warning' label='undefined' />;
          } else if (columnValue === true || columnValue?.toString()?.toLowerCase() === 'true') {
            return <Chip sx={{ textTransform: 'uppercase', fontStyle: 'italic' }} size='small' color='success' label='true' />;
          } else if (columnValue === false || columnValue?.toString()?.toLowerCase() === 'false') {
            return <Chip sx={{ textTransform: 'uppercase', fontStyle: 'italic' }} size='small' color='error' label='false' />;
          } else if (typeof columnValue === 'number') {
            return <pre style={{ textTransform: 'uppercase' }}>{columnValue}</pre>;
          } else if (typeof columnValue === 'object') {
            return <pre>{JSON.stringify(columnValue, null, 2)}</pre>;
          }
          return (
            <span
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                wordBreak: 'break-all',
                whiteSpace: 'nowrap',
                maxWidth: '250px',
              }}>
              {columnValue || ''}
            </span>
          );
        },
      };
    });
  }, [data]);

  return <DataTable {...props} columns={columns} />;
}
