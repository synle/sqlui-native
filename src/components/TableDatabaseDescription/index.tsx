import React from 'react';
import ColumnDatabaseDescription from 'src/components/ColumnDatabaseDescription';
import { useGetTables } from 'src/hooks';

type TableDatabaseDescriptionProps = {
  connectionId: string;
  databaseId: string;
};

export default function TableDatabaseDescription(props: TableDatabaseDescriptionProps) {
  const { databaseId, connectionId } = props;

  const { data: tables, isLoading } = useGetTables(connectionId, databaseId);

  if (isLoading) {
    return <>loading...</>;
  }

  if (!tables) {
    return <>No Data</>;
  }

  return (
    <div>
      {tables.map((table) => (
        <>
          <div>
            <h4>{table}</h4>
          </div>
          <ColumnDatabaseDescription
            connectionId={connectionId}
            databaseId={databaseId}
            tableId={table}
            key={table}
          />
        </>
      ))}
    </div>
  );
}
