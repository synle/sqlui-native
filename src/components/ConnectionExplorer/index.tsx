import React from 'react';
import { Link } from 'react-router-dom';

import ConnectionDatabaseDescription from 'src/components/ConnectionDatabaseDescription';
import {useGetConnections} from 'src/hooks';

export default function ConnectionExplorer() {
  // TODO: hard code for now
  const connections = [1, 2, 3].map((id) => ({ id: `connection.${id}` }));

  const {data, isLoading} = useGetConnections();

  if (isLoading){
    return<>loading...</>
  }
  console.log(data);

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
