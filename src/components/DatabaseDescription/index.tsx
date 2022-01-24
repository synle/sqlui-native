import React from 'react';
import TableDescription from 'src/components/TableDescription';
import { useGetDatabases, useShowHide } from 'src/hooks';

type DatabaseDescriptionProps = {
  connectionId: string;
};

export default function DatabaseDescription(props: DatabaseDescriptionProps) {
  const { connectionId } = props;
  const { data: databases, isLoading } = useGetDatabases(connectionId);
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!databases || databases.length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='DatabaseDescription'>
      {databases.map((database) => (
        <div key={database}>
          <div>
            <h4 onClick={() => onToggle(JSON.stringify({ ...props, database }))}>{database}</h4>
          </div>
          {!visibles[JSON.stringify({ ...props, database })] ? null : (
            <TableDescription connectionId={connectionId} databaseId={database} />
          )}
        </div>
      ))}
    </div>
  );
}
