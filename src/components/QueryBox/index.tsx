import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'sql-formatter';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import NativeSelect from '@mui/material/NativeSelect';
import PreviewIcon from '@mui/icons-material/Preview';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import {
  useGetConnections,
  useExecute,
  useConnectionQueries,
  useConnectionQuery,
  useShowHide,
  useGetDatabases,
  refreshAfterExecution,
} from 'src/hooks';
import CodeEditorBox from 'src/components/CodeEditorBox';
import ResultBox from 'src/components/ResultBox';
import { SqluiCore, SqluiFrontend } from 'typings';

interface QueryBoxProps {
  queryId: string;
}

export default function QueryBox(props: QueryBoxProps) {
  const { queryId } = props;
  const { query, onChange, onDelete, isLoading: loadingConnection } = useConnectionQuery(queryId);
  const { mutateAsync: executeQuery } = useExecute();
  const [executing, setExecuting] = useState(false);

  const isLoading = loadingConnection;

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (!query) {
    return null;
  }

  const onDatabaseConnectionChange = (connectionId?: string, databaseId?: string) => {
    onChange({ connectionId: connectionId, databaseId: databaseId });
  };

  const onSqlQueryChange = (newQuery: string) => {
    onChange({ sql: newQuery });
  };

  const onFormatQuery = () => {
    if (query && query.sql && query.sql.length > 20000) {
      // this is too large for the library to handle
      // let's stop it
      return;
    }
    onChange({ sql: format(query?.sql || '') });
  };

  const onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setExecuting(true);
    onChange({ executionStart: Date.now(), result: {} as SqluiCore.Result });

    try {
      const newResult = await executeQuery(query);
      onChange({ result: newResult });
      refreshAfterExecution(query);
    } catch (err) {
      //@ts-ignore
      // here query failed...
    }
    setExecuting(false);
    onChange({ executionEnd: Date.now() });
  };

  const disabledExecute = executing || !query?.sql || !query?.connectionId;

  return (
    <>
      <form className='QueryBox' onSubmit={onSubmit}>
        <div className='QueryBox__Row'>
          <ConnectionDatabaseSelector value={query} onChange={onDatabaseConnectionChange} />
          <ConnectionRevealButton query={query} />
        </div>
        <div className='QueryBox__Row'>
          <CodeEditorBox
            value={query.sql}
            placeholder={`Enter SQL for ` + query.name}
            onChange={onSqlQueryChange}
            language='sql'
            autoFocus
            mode='textarea'
          />
        </div>
        <div className='QueryBox__Row'>
          <Button
            type='submit'
            variant='contained'
            disabled={disabledExecute}
            startIcon={<SendIcon />}>
            Execute
          </Button>

          <Tooltip title='Format the SQL query for readability.'>
            <Button
              type='button'
              variant='outlined'
              onClick={onFormatQuery}
              startIcon={<FormatColorTextIcon />}
              sx={{ ml: 3 }}>
              Format
            </Button>
          </Tooltip>
        </div>
      </form>
      <ResultBox query={query} executing={executing} />
    </>
  );
}

// TODO: move me to a file
interface ConnectionDatabaseSelectorProps {
  value: SqluiFrontend.ConnectionQuery;
  onChange: (connectionId?: string, databaseId?: string) => void;
}

function ConnectionDatabaseSelector(props: ConnectionDatabaseSelectorProps) {
  const query = props.value;
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { data: databases, isLoading: loadingDatabases } = useGetDatabases(query.connectionId);

  const isLoading = loadingDatabases || loadingConnections;

  const connectionOptions = useMemo(
    () =>
      connections?.map((connection) => (
        <MenuItem value={connection.id} key={connection.id}>
          {connection.name}
        </MenuItem>
      )),
    [connections],
  );

  const databaseConnections = useMemo(
    () =>
      databases?.map((database) => (
        <MenuItem value={database.name} key={database.name}>
          {database.name}
        </MenuItem>
      )),
    [databases],
  );

  if (isLoading) {
    <>
      <Select disabled size='small'></Select>
      <Select disabled size='small' sx={{ ml: 3 }}></Select>
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
        onChange={(e) => onConnectionChange(e.target.value as string)}
        required
        size='small'>
        {connectionOptions}
      </Select>
      <Select
        value={query.databaseId}
        onChange={(e) => onDatabaseChange(e.target.value as string)}
        size='small'
        sx={{ ml: 3 }}>
        {databaseConnections}
      </Select>
    </>
  );
}

// TODO: move me to a file
interface ConnectionRevealButtonProps {
  query: SqluiFrontend.ConnectionQuery;
}
function ConnectionRevealButton(props: ConnectionRevealButtonProps) {
  const { query } = props;
  const { onToggle } = useShowHide();

  const onReveal = () => {
    const { databaseId, connectionId } = query;

    if (!connectionId) {
      return;
    }

    const branchesToReveal: string[] = [connectionId];

    if (databaseId && connectionId) {
      branchesToReveal.push([connectionId, databaseId].join(' > '));
    }

    for (const branchToReveal of branchesToReveal) {
      // reveal
      onToggle(branchToReveal, true);
    }
  };

  if (!query) {
    return null;
  }

  const disabled = !query.connectionId && !query.databaseId;

  return (
    <Tooltip title='Reveal this Connection on the connection tree.'>
      <span>
        <Button
          type='button'
          variant='outlined'
          startIcon={<PreviewIcon />}
          onClick={onReveal}
          sx={{ ml: 3 }}
          disabled={disabled}>
          Reveal
        </Button>
      </span>
    </Tooltip>
  );
}
