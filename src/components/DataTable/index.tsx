import {
  useTable,
  usePagination,
  useFilters,
  useGlobalFilter,
  useSortBy,
  Column,
} from 'react-table';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

interface DataTableProps {
  columns: any[];
  data: any[];
}

export default function DataTable(props: DataTableProps) {
  const { columns, data } = props;
  const tableInstance = useTable({ columns, data });
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = tableInstance;

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} size='small'>
        <TableHead>
          {
            headerGroups.map((headerGroup) => (
              <TableRow {...headerGroup.getHeaderGroupProps()}>
                {
                  headerGroup.headers.map((column) => (
                    <TableCell {...column.getHeaderProps()}>
                      {column.render('Header')}
                    </TableCell>
                  ))
                }
              </TableRow>
            ))
          }
        </TableHead>
        <TableBody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <TableRow {...row.getRowProps()}>
                {row.cells.map((cell) => {
                  return (
                    <TableCell>
                      {cell.render('Cell')}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
