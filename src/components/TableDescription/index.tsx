import React from 'react';
import ColumnDescription from 'src/components/ColumnDescription';
import { useGetTables } from 'src/hooks';

type TableDescriptionProps = {
  connectionId: string;
  databaseId: string;
};

export default function TableDescription(props: TableDescriptionProps) {
  const { databaseId, connectionId } = props;

  const { data: tables, isLoading } = useGetTables(connectionId, databaseId);

  if (isLoading) {
    return <>loading...</>;
  }

  if (!tables) {
    return <>No Data</>;
  }

  return (
    <div className='TableDescription'>
      {tables.map((table) => (
        <div key={table}>
          <div>
            <h4>{table}</h4>
          </div>
          <ColumnDescription connectionId={connectionId} databaseId={databaseId} tableId={table} />
        </div>
      ))}
    </div>
  );
}
