import React from 'react';
import Typography from '@mui/material/Typography';
import TableRowsIcon from '@mui/icons-material/TableRows';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import ColumnDescription from 'src/components/ColumnDescription';
import TableActions from 'src/components/TableActions';
import { useGetTables, useShowHide } from 'src/hooks';

type TableDescriptionProps = {
  connectionId: string;
  databaseId: string;
};

export default function TableDescription(props: TableDescriptionProps) {
  const { databaseId, connectionId } = props;
  const { data: tables, isLoading } = useGetTables(connectionId, databaseId);
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (!tables || tables.length === 0) {
    return <Alert severity='info'>Not Available</Alert>;
  }

  return (
    <div className='TableDescription'>
      {tables.map((table) => {
        const key = [connectionId, databaseId, table.name].join(' > ');
        return (
          <React.Fragment key={table.name}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <TableRowsIcon color='success' fontSize='inherit' />
              <span>{table.name}</span>
              <TableActions
                connectionId={connectionId}
                databaseId={databaseId}
                tableId={table.name}
              />
            </AccordionHeader>
            <AccordionBody expanded={visibles[key]}>
              <ColumnDescription
                connectionId={connectionId}
                databaseId={databaseId}
                tableId={table.name}
              />
            </AccordionBody>
          </React.Fragment>
        );
      })}
    </div>
  );
}
