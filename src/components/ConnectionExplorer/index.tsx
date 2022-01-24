import React from 'react';
import { Link } from 'react-router-dom';

import ConnectionDatabaseDescription from 'src/components/ConnectionDatabaseDescription';
import { useGetConnections } from 'src/hooks';

export default function ConnectionExplorer() {
  const { data: connections, isLoading } = useGetConnections();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!connections) {
    return <>No Data</>;
  }

  return (
    <div>
      {connections.map((connection) => (
        <>
          <h3>{connection.name}</h3>
          <div>
            <Link to={`/connection/edit/${connection.id}`}>Edit Connection</Link>
          </div>
          <ConnectionDatabaseDescription connectionId={connection.id} key={connection.id} />
        </>
      ))}
    </div>
  );
}
