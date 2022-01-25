import React from 'react';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import ColumnDescription from 'src/components/ColumnDescription';
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
    return <>loading...</>;
  }

  if (!tables || tables.length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='TableDescription'>
      {tables.map((table) => {
        const key = JSON.stringify({ ...props, table });
        return (
          <React.Fragment key={table}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <span>{table}</span>
            </AccordionHeader>
            <AccordionBody expanded={visibles[key]}>
              <ColumnDescription
                connectionId={connectionId}
                databaseId={databaseId}
                tableId={table}
              />
            </AccordionBody>
          </React.Fragment>
        );
      })}
    </div>
  );
}
