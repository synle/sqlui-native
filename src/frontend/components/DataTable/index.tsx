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
import React, { useCallback, useMemo } from 'react';
import { useTablePageSize } from 'src/frontend/hooks/useSetting';

type DataTableProps = {
  columns: any[];
  data: any[];
  onRowClick?:(rowData: any) => void;
};

export const pageSizeOptions: any[] = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: 'Show All', value: -1 },
];

export const DEFAULT_TABLE_PAGE_SIZE = 50;

function TableContainerWrapper(props: any) {
  return (
    <Paper square={true} variant='outlined'>
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

  const defaultPageSize = useTablePageSize();

  const { getTableBodyProps, gotoPage, headerGroups, page, prepareRow, setPageSize, state } =
    useTable(
      {
        initialState: {
          pageSize: defaultPageSize || DEFAULT_TABLE_PAGE_SIZE,
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
          <TableBody {...getTableBodyProps()}>
            {page.map((row) => {
              prepareRow(row);
              return (
                <StyledTableRow {...row.getRowProps()} onClick={() => props.onRowClick && props.onRowClick(row.original)} style={{cursor: props.onRowClick ? 'pointer' : ''}}>
                  {row.cells.map((cell) => {
                    return (
                      <StyledTableCell {...cell.getCellProps()}>
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
    for (const row of data) {
      for (const header of Object.keys(row)) {
        newColumnNames.add(header);
      }
    }
    return Array.from(newColumnNames).map((columnName) => {
      return {
        Header: columnName,
        Cell: (data: any) => {
          const columnValue = data.row.original[columnName];
          if (typeof columnValue === 'object') {
            return <pre>{JSON.stringify(columnValue, null, 2)}</pre>;
          }
          if (typeof columnValue === 'number') {
            return columnValue;
          }
          return columnValue || '';
        },
      };
    });
  }, []);

  return <DataTable {...props} columns={columns} />;
}
