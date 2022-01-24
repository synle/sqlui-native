import React from 'react';
import TableDatabaseDescription from 'src/components/TableDatabaseDescription';
import { useGetDatabases } from 'src/hooks';

type ConnectionDatabaseDescriptionProps = {
  connectionId: string;
};

export default function ConnectionDatabaseDescription(props: ConnectionDatabaseDescriptionProps) {
  const { connectionId } = props;

  const { data: databases, isLoading } = useGetDatabases(connectionId);

  if (isLoading) {
    return <>loading...</>;
  }

  if (!databases) {
    return <>No Data</>;
  }

  return (
    <div>
      {databases.map((database) => (
        <>
          <div>
            <h4>{database}:</h4>
          </div>
          <TableDatabaseDescription
            connectionId={connectionId}
            databaseId={database}
            key={database}
          />
        </>
      ))}
    </div>
  );
}
