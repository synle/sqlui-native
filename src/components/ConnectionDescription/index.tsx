import React from 'react';
import { Link } from 'react-router-dom';

import DatabaseDescription from 'src/components/DatabaseDescription';
import { useGetConnections, useShowHide } from 'src/hooks';

export default function ConnectionDescription() {
  const { data: connections, isLoading } = useGetConnections();
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!connections || connections.length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='ConnectionDescription'>
      {connections.map((connection) => (
        <div key={connection.id}>
          <h3 onClick={() => onToggle(connection.id)}>{connection.name}</h3>
          <div>
            <Link to={`/connection/edit/${connection.id}`}>Edit Connection</Link>
          </div>

          {!visibles[connection.id] ? null : <DatabaseDescription connectionId={connection.id} />}
        </div>
      ))}
    </div>
  );
}
