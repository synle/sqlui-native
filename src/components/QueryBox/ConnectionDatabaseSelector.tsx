import {useMemo} from 'react';
import {SqluiFrontend} from 'typings';
import {useGetConnections} from 'src/hooks';
import {useGetDatabases} from 'src/hooks';
import Select from 'src/components/Select';

interface ConnectionDatabaseSelectorProps {
  value: SqluiFrontend.ConnectionQuery;
  onChange: (connectionId?: string, databaseId?: string) => void;
}

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
    props.onChange(connectionId, '');
  };

  const onDatabaseChange = (databaseId: string) => {
    props.onChange(query.connectionId, databaseId);
  };

  return (
    <>
      <Select
        value={query.connectionId}
        onChange={(newValue) => onConnectionChange(newValue)}
        required>
        <option value=''>Pick a Connection</option>
        {connectionOptions}
      </Select>
      <Select
        value={query.databaseId}
        onChange={(newValue) => onDatabaseChange(newValue)}
        sx={{ ml: 3 }}>
        <option value=''>Pick a Database (Optional)</option>
        {databaseConnections}
      </Select>
    </>
  );
}