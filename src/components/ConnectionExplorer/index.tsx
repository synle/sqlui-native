import React from 'react';
import { Link } from 'react-router-dom';

import ConnectionDatabaseDescription from 'src/components/ConnectionDatabaseDescription';

export default function ConnectionExplorer() {
  // TODO: hard code for now
  const connections = [1, 2, 3].map((id) => ({ id: `connection.${id}` }));
  return (
    <div>
      {connections.map((connection) => (
        <>
          <h3>Connection {connection.id}:</h3>
          <div>
            <Link to={`/connection/edit/${connection.id}`}>Edit Connection</Link>
          </div>
          <ConnectionDatabaseDescription id={connection.id} key={connection.id} />
        </>
      ))}
    </div>
  );
}
