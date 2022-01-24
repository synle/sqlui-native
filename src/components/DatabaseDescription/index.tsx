import React from 'react';
import TableDescription from 'src/components/TableDescription';
import { useGetDatabases } from 'src/hooks';

type DatabaseDescriptionProps = {
  connectionId: string;
};

export default function DatabaseDescription(props: DatabaseDescriptionProps) {
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
          <TableDescription connectionId={connectionId} databaseId={database} key={database} />
        </>
      ))}
    </div>
  );
}
