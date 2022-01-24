import React from 'react';
import { useGetColumns } from 'src/hooks';

type ColumnDescriptionProps = {
  connectionId: string;
  databaseId: string;
  tableId: string;
};

export default function ColumnDescription(props: ColumnDescriptionProps) {
  const { databaseId, connectionId, tableId } = props;

  const { data: columns, isLoading } = useGetColumns(connectionId, databaseId, tableId);

  if (isLoading) {
    return <>loading...</>;
  }

  if (!columns) {
    return <>No Data</>;
  }

  return (
    <div className='ColumnDescription'>
      {Object.keys(columns).map((columnName) => {
        const column = columns[columnName];

        return (
          <div key={columnName}>
            <div>
              <h4>{columnName}</h4>
            </div>
            <pre>{JSON.stringify(column, null, 2)}</pre>
          </div>
        );
      })}
    </div>
  );
}
