import React from 'react';

import TableDatabaseDescription from 'src/components/TableDatabaseDescription';

type ConnectionDatabaseDescriptionProps = {
  /**
   * @type String : connectionId
   */
  id: string;
};

export default function ConnectionDatabaseDescription(props: ConnectionDatabaseDescriptionProps) {
  const connectionId = props.id;

  // TODO: hard code for now
  const databases = [4, 5, 6].map((id) => ({ id: `db.${connectionId}.${id}` }));

  return (
    <div>
      {databases.map((database) => (
        <>
          <div>
            <h4>Database {database.id}:</h4>
          </div>
          <TableDatabaseDescription id={database.id} key={database.id} />
        </>
      ))}
    </div>
  );
}
