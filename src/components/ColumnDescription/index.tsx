import React from 'react';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import { useGetColumns, useShowHide } from 'src/hooks';

type ColumnDescriptionProps = {
  connectionId: string;
  databaseId: string;
  tableId: string;
};

export default function ColumnDescription(props: ColumnDescriptionProps) {
  const { databaseId, connectionId, tableId } = props;
  const { data: columns, isLoading } = useGetColumns(connectionId, databaseId, tableId);
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!columns || Object.keys(columns).length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='ColumnDescription'>
      {Object.keys(columns).map((columnName) => {
        const column = columns[columnName];
        const key = JSON.stringify({ ...props, columnName });
        return (
          <React.Fragment key={columnName}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <span>{columnName}</span>
            </AccordionHeader>
            <AccordionBody expanded={visibles[key]}>
              <pre>{JSON.stringify(column, null, 2)}</pre>
            </AccordionBody>
          </React.Fragment>
        );
      })}
    </div>
  );
}
