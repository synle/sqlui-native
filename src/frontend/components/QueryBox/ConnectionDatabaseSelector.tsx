import Box from '@mui/material/Box';
import { useMemo, useEffect } from 'react';
import { getIsTableIdRequiredForQueryByDialect } from 'src/common/adapters/DataScriptFactory';
import ConnectionTypeIcon from 'src/frontend/components/ConnectionTypeIcon';
import Select from 'src/frontend/components/Select';
import {
  useGetConnectionById,
  useGetConnections,
  useGetDatabases,
  useGetTables,
} from 'src/frontend/hooks/useConnection';
import { SqluiFrontend } from 'typings';
import useToaster from 'src/frontend/hooks/useToaster';
type ConnectionDatabaseSelectorProps = {
  value: Partial<SqluiFrontend.ConnectionQuery>;
  onChange: (connectionId?: string, databaseId?: string, tableId?: string) => void;
  isTableIdRequired?: boolean;
  disabledConnection?: boolean;
  disabledDatabase?: boolean;
  required?: boolean;
};

export default function ConnectionDatabaseSelector(props: ConnectionDatabaseSelectorProps) {
  const query = props.value;
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { data: connection } = useGetConnectionById(query?.connectionId);
  const { data: databases, isLoading: loadingDatabases } = useGetDatabases(query.connectionId);
  const { data: tables, isLoading: loadingTables } = useGetTables(
    query.connectionId,
    query.databaseId,
  );
  const { add: addToast } = useToaster();
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

  const isTableIdRequired =
    useMemo<boolean>(() => {
      const selectedConnection = connections?.find(
        (connection) => connection.id === query.connectionId,
      );
      return getIsTableIdRequiredForQueryByDialect(selectedConnection?.dialect);
    }, [connections, query.connectionId]) ||
    !!props.isTableIdRequired ||
    true;

  if (isLoading) {
    <>
      <Select disabled></Select>
      <Select disabled sx={{ ml: 3 }}></Select>
    </>;
  }

  const onConnectionChange = (connectionId: string) => props.onChange(connectionId, '', '');

  const onDatabaseChange = (databaseId: string) => props.onChange(query.connectionId, databaseId, '');

  const onTableChange = (tableId: string) => props.onChange(query.connectionId, query.databaseId, tableId);

  // side effect to select the only database or table
  useEffect(() => {
    let shouldShowToast = false;

    // if there's only one database, then select that as well
    if(databases?.length === 1 && query.databaseId !== databases[0].name){
      onDatabaseChange(databases[0].name);
      shouldShowToast = true;
    }

    // if there's only one table, then select that as well
    if(tables?.length === 1 && query.tableId !== tables[0].name){
      onTableChange(tables[0].name);
      shouldShowToast = true;
    }

    if(shouldShowToast){
      addToast({
        message: <>We have auto-selected the only database or table present in this connection.</>,
      });
    }
  },[query, databases, tables])

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ConnectionTypeIcon dialect={connection?.dialect} status={connection?.status} />
        <Select
          value={query.connectionId}
          onChange={(newValue) => onConnectionChange(newValue)}
          required
          disabled={!!props.disabledConnection}>
          <option value=''>Pick a Connection</option>
          {connectionOptions}
        </Select>
      </Box>
      <Select
        value={query.databaseId}
        onChange={(newValue) => onDatabaseChange(newValue)}
        disabled={!!props.disabledDatabase}
        required={props.required}>
        <option value=''>Pick a Database (Optional)</option>
        {databaseOptions}
      </Select>
      {isTableIdRequired && (
        <Select
          value={query.tableId}
          onChange={(newValue) => onTableChange(newValue)}
          required={props.required}>
          <option value=''>Pick a Table</option>
          {tableOptions}
        </Select>
      )}
    </>
  );
}
