import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { useFilters, useGlobalFilter, usePagination, useSortBy, useTable } from 'react-table';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { DropdownButtonOption } from 'src/frontend/components/DropdownButton';
import DropdownMenu from 'src/frontend/components/DropdownMenu';
import { useTablePageSize } from 'src/frontend/hooks/useSetting';
import { sortColumnNamesForUnknownData } from 'src/frontend/utils/commonUtils';
import { useVirtualizer } from '@tanstack/react-virtual';

type DataTableProps = {
  columns: any[];
  data: any[];
  onRowClick?: (rowData: any) => void;
  rowContextOptions?: DropdownButtonOption[];
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

function TableContainerWrapper(props: any): JSX.Element | null {
  return (
    <Paper square={true} variant='outlined' sx={{ overflow: 'auto' }}>
      {props.children}
    </Paper>
  );
}
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: '1rem',
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.focus,
  },
}));

const StyledDivRow = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 2,
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

  const pageSizeOptions = ALL_PAGE_SIZE_OPTIONS.map((option) => ({ ...option }));
  pageSizeOptions[pageSizeOptions.length - 1].value = allRecordSize;

  const { getTableBodyProps, gotoPage, headerGroups, page, prepareRow, setPageSize, state } =
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

  const onRowContextMenuClick = (e: React.SyntheticEvent) => {
    const target = e.target as HTMLElement;
    const tr = target.closest('tr');
    const siblings = target.closest('tbody')?.children;
    if (siblings) {
      for (let rowIdx = 0; rowIdx < siblings.length; rowIdx++) {
        if (siblings[rowIdx] === tr) {
          e.preventDefault();
          setOpenContextMenuRowIdx(rowIdx);
          anchorEl.current = target;
          break;
        }
      }
    }
  };

  const targetRowContextOptions = (props.rowContextOptions || []).map((rowContextOption) => ({
    ...rowContextOption,
    onClick: () =>
      rowContextOption.onClick && rowContextOption.onClick(data[openContextMenuRowIdx]),
  }));

   // The scrollable element for your list
  const parentRef = React.useRef<HTMLTableElement | null>(null)

  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: page.length + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 30,
  })

  const tableHeight = '500px';

  return (
    <>
       {/* The scrollable element for your list */}
      <Box
        ref={parentRef}
        sx={{
          height: `400px`,
          overflow: 'auto', // Make it scroll!
        }}
      >
      {/* The large inner element to hold all of the items */}
        <Box
          sx={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Only the visible items in the virtualizer, manually positioned to be in view */}
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            let rowIdx = virtualItem.index - 1;

            if(rowIdx < 0){
              return <>
               {headerGroups.map((headerGroup, headerGroupIdx) => (
                <StyledDivRow
                sx={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
               {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column, colIdx) => (
                    <Box
                      {...column.getHeaderProps()}
                      sx={{ width: '100px' }}>
                      {column.render('Header')}
                    </Box>
                  ))}
                </StyledDivRow>
              ))}
              </>
            }

            const row = page[rowIdx];
            prepareRow(row);

            return (
              <StyledDivRow
                key={virtualItem.key}
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
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
                      <Box {...cell.getCellProps()} sx={{width: '100px'}}>
                        {dropdownContent}
                        {cell.render('Cell')}
                      </Box>
                    );
                  })}
              </StyledDivRow>
            )})}
        </Box>

      </Box>
      <TablePagination
        component='div'
        count={data.length}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        page={pageIndex}
        rowsPerPage={pageSize}
        rowsPerPageOptions={pageSizeOptions}
        showFirstButton
        showLastButton
      />
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
        Cell: (data: any) => {
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
