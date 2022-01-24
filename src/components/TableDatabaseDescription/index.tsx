import React from 'react';
import ColumnDatabaseDescription from 'src/components/ColumnDatabaseDescription';

type TableDatabaseDescriptionProps = {
  /**
   * @type String : databaseId
   */
  id: string;
};

export default function TableDatabaseDescription(props: TableDatabaseDescriptionProps) {
  const databaseId = props.id;

  // TODO: hard code for now
  const tables = [7, 8, 9].map((id) => ({ id: `tbl.${databaseId}.${id}` }));

  return (
    <div>
      {tables.map((table) => (
        <>
          <div>
            <h4>Table {table.id}:</h4>
          </div>
          <ColumnDatabaseDescription id={table.id} key={table.id} />
        </>
      ))}
    </div>
  );
}
