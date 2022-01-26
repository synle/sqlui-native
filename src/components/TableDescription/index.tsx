import React from 'react';
import TableRowsIcon from '@mui/icons-material/TableRows';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import ColumnDescription from 'src/components/ColumnDescription';
import { useGetMetaData, useGetTables, useShowHide } from 'src/hooks';

type TableDescriptionProps = {
  connectionId: string;
  databaseId: string;
};

export default function TableDescription(props: TableDescriptionProps) {
  const { databaseId, connectionId } = props;
  const { data: connections, isLoading } = useGetMetaData();
  const tables = useGetTables(connectionId, databaseId, connections);
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!tables || tables.length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='TableDescription'>
      {tables.map((table) => {
        const key = JSON.stringify({ ...props, table: table.name });
        return (
          <React.Fragment key={table.name}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <TableRowsIcon />
              <span>{table.name}</span>
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
