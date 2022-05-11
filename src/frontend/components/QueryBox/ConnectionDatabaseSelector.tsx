import { useMemo } from 'react';
import Select from 'src/frontend/components/Select';
import { useGetConnections, useGetDatabases, useGetTables } from 'src/frontend/hooks/useConnection';
import { SqluiFrontend } from 'typings';

type ConnectionDatabaseSelectorProps = {
  value: SqluiFrontend.ConnectionQuery;
  onChange: (connectionId?: string, databaseId?: string, tableId?: string) => void;
};

export default function ConnectionDatabaseSelector(props: ConnectionDatabaseSelectorProps) {
  const query = props.value;
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { data: databases, isLoading: loadingDatabases } = useGetDatabases(query.connectionId);
  const { data: tables, isLoading: loadingTables } = useGetTables(query.connectionId, query.databaseId);
  const isLoading = loadingDatabases || loadingConnections || loadingTables;

  const connectionOptions = useMemo(
    () =>
      connections?.map((connection) => (
        <option value={connection.id} key={connection.id}>
          {connection.name}
        </option>
      )),
    [connections],
  );

  const databaseOptions = useMemo(
    () =>
      databases?.map((database) => (
        <option value={database.name} key={database.name}>
          {database.name}
        </option>
      )),
    [databases],
  );

  const tableOptions = useMemo(
    () =>
      tables?.map((table) => (
        <option value={table.name} key={table.name}>
          {table.name}
        </option>
      )),
    [tables],
  );

  const isDatabaseIdRequired = false;

  const isTableIdRequired = useMemo<boolean>(
    () => {
      const selectedConnection = connections?.find((connection) => connection.id === query.connectionId);
      return selectedConnection?.dialect === "cosmosdb";
    }
    ,[connections, query.connectionId]);

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
        {databaseOptions}
      </Select>
      {
        isTableIdRequired && <Select value={query.tableId} onChange={(newValue) => onTableChange(newValue)}>
              <option value=''>Pick a Table</option>
              {tableOptions}
            </Select>
      }
    </>
  );
}
