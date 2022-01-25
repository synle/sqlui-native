import ColumnDescription from 'src/components/ColumnDescription';
import { useGetTables, useShowHide } from 'src/hooks';

type TableDescriptionProps = {
  connectionId: string;
  databaseId: string;
};

export default function TableDescription(props: TableDescriptionProps) {
  const { databaseId, connectionId } = props;
  const { data: tables, isLoading } = useGetTables(connectionId, databaseId);
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!tables || tables.length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='TableDescription'>
      {tables.map((table) => (
        <div key={table}>
          <div>
            <a onClick={() => onToggle(JSON.stringify({ ...props, table }))}>{table}</a>
          </div>
          {!visibles[JSON.stringify({ ...props, table })] ? null : (
            <ColumnDescription
              connectionId={connectionId}
              databaseId={databaseId}
              tableId={table}
            />
          )}
        </div>
      ))}
    </div>
  );
}
