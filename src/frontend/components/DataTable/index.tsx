import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useFilters, useGlobalFilter, usePagination, useSortBy, useTable } from 'react-table';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { DropdownButtonOption } from 'src/frontend/components/DropdownButton';
import DropdownMenu from 'src/frontend/components/DropdownMenu';
import { useTablePageSize } from 'src/frontend/hooks/useSetting';
import { sortColumnNamesForUnknownData } from 'src/frontend/utils/commonUtils';

type DataTableProps = {
  columns: any[];
  data: any[];
  onRowClick?: (rowData: any) => void;
  rowContextOptions?: DropdownButtonOption[];
  searchInputId?: string;
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
const tableCellHeight = 30;
const tableCellWidth = 125;

const StyledDivContainer = styled('div')(({ theme }) => ({}));

const StyledDivHeaderRow = styled('div')(({ theme }) => ({
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  fontSize: '1rem',
  flexWrap: 'nowrap',
  position: 'sticky',
  top: 0,
  left: 0,
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.common.black,
  color: theme.palette.common.white,
  borderBottom: `1px solid ${theme.palette.divider}`,

  '> div': {
    height: `${tableCellHeight}px`,
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
  fontSize: '1rem',
  userSelect: 'none',
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
  width: `${tableCellWidth}px`,
  paddingInline: '0.5rem',
}));

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
   } =
    useTable(
      {
        initialState: {
          pageSize: pageSizeToUse,
        },
        columns,
        data,
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

  const onRowContextMenuClick = (e: React.SyntheticEvent, rowIdx: number) => {
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
    getScrollElement: () => parentRef.current,
    estimateSize: () => tableCellHeight,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => tableCellWidth,
    overscan: 5,
  })

  return (
    <>
      {
        props.searchInputId && <TextField
          id={props.searchInputId}
              label="Search Table"
              size='small'
              fullWidth
              onChange={e => setGlobalFilter(e.target.value)}
              sx={{mb: 2}}
              variant="standard"
            />}
      {
        !page || page.length === 0 ? <Box>There is no data.</Box>
        : <Box
        ref={parentRef}
        sx={{
          maxHeight: tableHeight,
          overflow: 'auto', // Make it scroll!
        }}>
        <StyledDivContainer
          sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}>
          {headerGroups.map((headerGroup, headerGroupIdx) => (
            <StyledDivHeaderRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column, colIdx) => (
                <StyledDivContentCell {...column.getHeaderProps()}>{column.render('Header')}</StyledDivContentCell>
              ))}
            </StyledDivHeaderRow>
          ))}
          {rowVirtualizer.getVirtualItems().map((rowVirtualItem) => {
            const rowIdx = rowVirtualItem.index;
            const row = page[rowIdx];
            prepareRow(row);

            return (
              <StyledDivContentRow
                key={rowVirtualItem.key}
                onDoubleClick={() => props.onRowClick && props.onRowClick(row.original)}
                onContextMenu={(e) => onRowContextMenuClick(e, rowIdx)}
                style={{
                  cursor: props.onRowClick ? 'pointer' : '',
                  height: `${rowVirtualItem.size}px`,
                  transform: `translateY(${rowVirtualItem.start + tableCellHeight}px)`,
                }}>
                {columnVirtualizer.getVirtualItems().map((cellVirtualItem) => {
                  const colIdx = rowVirtualItem.index;
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
                    <StyledDivContentCell {...cell.getCellProps()}>
                      {dropdownContent}
                      {cell.render('Cell')}
                    </StyledDivContentCell>
                  );
                })}
              </StyledDivContentRow>
            );
          })}
        </StyledDivContainer>
      </Box>
      }
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
        accessor: (data: any) => {
          const columnValue = data[columnName];
          const html = document.createElement('p');
          html.innerHTML = columnValue;
          return html.innerText;
        },
        Cell: (data: any,a,b,c) => {
          const columnValue = data.row.original[columnName];
          if (columnValue === null) {
            return <pre style={{ textTransform: 'uppercase', fontStyle: 'italic' }}>NULL</pre>;
          } else if (columnValue === true || columnValue === false) {
            return (
              <pre style={{ textTransform: 'uppercase', fontStyle: 'italic' }}>
                {columnValue.toString()}
              </pre>
            );
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
