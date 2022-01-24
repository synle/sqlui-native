import React from 'react';

type ColumnDatabaseDescriptionProps = {
  /**
   * @type String : tableId
   */
  id: string;
};

export default function ColumnDatabaseDescription(props: ColumnDatabaseDescriptionProps) {
  const tableId = props.id;

  // TODO: hard code for now
  const columns = ['a', 'b', 'c'].map((id) => ({ id: `column.${tableId}.${id}` }));

  return (
    <div>
      {columns.map((column) => (
        <>
          <div>
            <h4>column {column.id}:</h4>
          </div>
        </>
      ))}
    </div>
  );
}
