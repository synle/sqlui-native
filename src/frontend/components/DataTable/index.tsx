import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import { useMemo } from 'react';
import LegacyDataTable from 'src/frontend/components/DataTable/LegacyDataTable';
import ModernDataTable from 'src/frontend/components/DataTable/ModernDataTable';
import { DropdownButtonOption } from 'src/frontend/components/DropdownButton';

export type DataTableProps = {
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

export function DataTableWithJSONList(props: Omit<DataTableProps, 'columns'>) {
  const { data } = props;

  let hasRawJson = useMemo(() => {
    for (const value of data) {
      if (value !== null) {
        for (const columnValue of Object.values(value)) {
          if (typeof columnValue === 'object' && columnValue !== null) {
            return true;
          }
        }
      }
    }

    return false;
  }, [data]);

  const columns = useMemo(() => {
    const newColumnNames = new Set<string>();
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (typeof row === 'object' && row !== null) {
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

    return [...newColumnNames].map((columnName) => {
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
          } else if (typeof columnValue === 'object') {
            columnValue = JSON.stringify(columnValue);
          }

          const html = document.createElement('p');
          html.innerHTML = columnValue;
          return html.innerText;
        },
        Cell: (data: any, a, b, c) => {
          const columnValue = data.row.original[columnName];
          if (columnValue === null) {
            return (
              <Chip
                sx={{ textTransform: 'uppercase', fontStyle: 'italic' }}
                size='small'
                color='info'
                label='null'
              />
            );
          } else if (columnValue === undefined) {
            return (
              <Chip
                sx={{ textTransform: 'uppercase', fontStyle: 'italic' }}
                size='small'
                color='default'
                label='undefined'
              />
            );
          } else if (columnValue === true || columnValue?.toString()?.toLowerCase() === 'true') {
            return (
              <Chip
                sx={{ textTransform: 'uppercase', fontStyle: 'italic' }}
                size='small'
                color='success'
                label='true'
              />
            );
          } else if (columnValue === false || columnValue?.toString()?.toLowerCase() === 'false') {
            return (
              <Chip
                sx={{ textTransform: 'uppercase', fontStyle: 'italic' }}
                size='small'
                color='error'
                label='false'
              />
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

  // if (hasRawJson) {
  //   return <LegacyDataTable {...props} columns={columns} />;
  // }
  // return <ModernDataTable {...props} columns={columns} />;

  // always use legacy table for now
  return <LegacyDataTable {...props} columns={columns} />;
}

export default LegacyDataTable;