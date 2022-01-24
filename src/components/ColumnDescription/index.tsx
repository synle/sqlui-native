import React from 'react';
import { useGetColumns, useShowHide } from 'src/hooks';

type ColumnDescriptionProps = {
  connectionId: string;
  databaseId: string;
  tableId: string;
};

export default function ColumnDescription(props: ColumnDescriptionProps) {
  const { databaseId, connectionId, tableId } = props;
  const { data: columns, isLoading } = useGetColumns(connectionId, databaseId, tableId);
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!columns || Object.keys(columns).length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='ColumnDescription'>
      {Object.keys(columns).map((columnName) => {
        const column = columns[columnName];

        return (
          <div key={columnName}>
            <div>
              <h6 onClick={() => onToggle(JSON.stringify({ ...props, columnName }))}>
                {columnName}
              </h6>
            </div>
            {!visibles[JSON.stringify({ ...props, columnName })] ? null : (
              <pre>{JSON.stringify(column, null, 2)}</pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
