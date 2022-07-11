import Paper from '@mui/material/Paper';
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

function TableContainerWrapper(props: any) {
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

export default function DataTable(props: DataTableProps) {
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

  return (
    <>
      <TableContainer component={TableContainerWrapper}>
        <Table sx={{ minWidth: 650 }} size='small'>
          <TableHead>
            {headerGroups.map((headerGroup) => (
              <TableRow {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column, colIdx) => (
                  <StyledTableCell
                    {...column.getHeaderProps()}
                    sx={{ width: columns[colIdx].width }}>
                    {column.render('Header')}
                  </StyledTableCell>
                ))}
              </TableRow>
            ))}
          </TableHead>
          <TableBody {...getTableBodyProps()} onContextMenu={(e) => onRowContextMenuClick(e)}>
            {page.map((row, rowIdx) => {
              prepareRow(row);
              return (
                <StyledTableRow
                  {...row.getRowProps()}
                  onClick={() => props.onRowClick && props.onRowClick(row.original)}
                  style={{ cursor: props.onRowClick ? 'pointer' : '' }}>
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
                      <StyledTableCell {...cell.getCellProps()}>
                        {dropdownContent}
                        {cell.render('Cell')}
                      </StyledTableCell>
                    );
                  })}
                </StyledTableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
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
          } else if (typeof columnValue === 'string') {
            return <pre style={{ textTransform: 'uppercase' }}>{columnValue}</pre>;
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
