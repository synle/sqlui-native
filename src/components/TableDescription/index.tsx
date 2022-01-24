import React from 'react';
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
      {tables.map((table) => (
        <div key={table}>
          <div>
            <h5 onClick={() => onToggle(JSON.stringify({ ...props, table }))}>{table}</h5>
          </div>
          {!visibles[JSON.stringify({ ...props, table })] ? null : (
            <ColumnDescription
              connectionId={connectionId}
              databaseId={databaseId}
              tableId={table}
            />
          )}
        </div>
      ))}
    </div>
  );
}
