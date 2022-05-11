import { useMemo } from 'react';
import Select from 'src/frontend/components/Select';
import { useGetConnections, useGetDatabases } from 'src/frontend/hooks/useConnection';
import { SqluiFrontend } from 'typings';

type ConnectionDatabaseSelectorProps = {
  value: SqluiFrontend.ConnectionQuery;
  onChange: (connectionId?: string, databaseId?: string, tableId?: string) => void;
};

export default function ConnectionDatabaseSelector(props: ConnectionDatabaseSelectorProps) {
  const query = props.value;
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { data: databases, isLoading: loadingDatabases } = useGetDatabases(query.connectionId);

  const isLoading = loadingDatabases || loadingConnections;

  const connectionOptions = useMemo(
    () =>
      connections?.map((connection) => (
        <option value={connection.id} key={connection.id}>
          {connection.name}
        </option>
      )),
    [connections],
  );

  const databaseConnections = useMemo(
    () =>
      databases?.map((database) => (
        <option value={database.name} key={database.name}>
          {database.name}
        </option>
      )),
    [databases],
  );

  if (isLoading) {
    <>
      <Select disabled></Select>
      <Select disabled sx={{ ml: 3 }}></Select>
    </>;
  }

  const onConnectionChange = (connectionId: string) => {
    props.onChange(connectionId, '', '');
  };

  const onDatabaseChange = (databaseId: string) => {
    props.onChange(query.connectionId, databaseId, '');
  };

  const onTableChange = (tableId: string) => {
    props.onChange(query.connectionId, query.databaseId, tableId);
  }

  return (
    <>
      <Select
        value={query.connectionId}
        onChange={(newValue) => onConnectionChange(newValue)}
        required>
        <option value=''>Pick a Connection</option>
        {connectionOptions}
      </Select>
      <Select value={query.databaseId} onChange={(newValue) => onDatabaseChange(newValue)}>
        <option value=''>Pick a Database (Optional)</option>
        {databaseConnections}
      </Select>
    </>
  );
}
