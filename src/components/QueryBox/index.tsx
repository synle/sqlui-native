import React, { useState, useEffect } from 'react';
import { format } from 'sql-formatter';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import NativeSelect from '@mui/material/NativeSelect';
import CodeEditor from '@uiw/react-textarea-code-editor';
import PreviewIcon from '@mui/icons-material/Preview';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import Tooltip from '@mui/material/Tooltip';
import {
  useGetConnections,
  useExecute,
  useConnectionQueries,
  useConnectionQuery,
  useShowHide,
  useGetDatabases,
} from 'src/hooks';
import { SqluiCore, SqluiFrontend } from 'typings';

interface QueryBoxProps {
  queryId: string;
}

export default function QueryBox(props: QueryBoxProps) {
  const { queryId } = props;
  const {
    query,
    onChange,
    onDelete,
    isLoading: loadingConnection,
    onExecute,
  } = useConnectionQuery(queryId);
  const { isLoading: executing } = useExecute(query);

  const isLoading = loadingConnection;

  if (isLoading) {
    return <Alert severity='info'>Loading...</Alert>;
  }

  if (!query) {
    return null;
  }

  const onDatabaseConnectionChange = (connectionId?: string, databaseId?: string) => {
    onChange('connectionId', connectionId);
    onChange('databaseId', databaseId);
  };

  const onSqlQueryChange = (newQuery: string) => {
    onChange('sql', newQuery);
  };

  const onFormatQuery = () => {
    onChange('sql', format(query?.sql || ''));
  };

  const onSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onExecute();
  };

  const disabledExecute = executing || !query?.sql || !query?.connectionId;

  return (
    <form className='QueryBox' onSubmit={onSubmit}>
      <div className='QueryBox__Row'>
        <Typography variant='h6'>{query.name}</Typography>
      </div>
      <div className='QueryBox__Row'>
        <ConnectionDatabaseSelector value={query} onChange={onDatabaseConnectionChange} />
        <ConnectionRevealButton query={query} />
      </div>
      <div className='QueryBox__Row'>
        <CodeEditor
          value={query.sql}
          language='sql'
          placeholder={`Enter SQL for ` + query.name}
          onBlur={(e) => onSqlQueryChange(e.target.value)}
          padding={10}
          minHeight={200}
          autoFocus
          style={{
            backgroundColor: '#f5f5f5',
            border: 'none',
            fontFamily: 'monospace',
          }}
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
  );
}

// TODO: move me to a file
interface ConnectionDatabaseSelectorProps {
  value: SqluiFrontend.ConnectionQuery;
  onChange: (connectionId?: string, databaseId?: string) => void;
}

function ConnectionDatabaseSelector(props: ConnectionDatabaseSelectorProps) {
  const query = props.value;
  const value = [query.connectionId, query.databaseId].join(' << ');
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { data: databases, isLoading: loadingDatabases } = useGetDatabases(query.connectionId);

  const isLoading = loadingDatabases || loadingConnections;

  const onConnectionChange = (connectionId: string) => {
    props.onChange(connectionId, undefined);
  };

  const onDatabaseChange = (databaseId: string) => {
    props.onChange(query.connectionId, databaseId);
  };

  const connectionOptions = connections?.map((connection) => (
    <option value={connection.id} key={connection.id}>
      {connection.name}
    </option>
  ));

  const databaseConnections = databases?.map((database) => (
    <option value={database.name} key={database.name}>
      {database.name}
    </option>
  ));

  useEffect(() => {
    if (databases?.length === 1) {
      // if there is only one database, let's select it
      onDatabaseChange(databases[0].name);
    }
  }, [databases]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <NativeSelect
        value={query.connectionId}
        onChange={(e) => onConnectionChange(e.target.value)}
        required>
        <option value=''>Pick One</option>
        {connectionOptions}
      </NativeSelect>
      <NativeSelect
        value={query.databaseId}
        onChange={(e) => onDatabaseChange(e.target.value)}
        sx={{ ml: 3 }}>
        <option value=''>Pick One</option>
        {databaseConnections}
      </NativeSelect>
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
      <Button
        type='button'
        variant='outlined'
        startIcon={<PreviewIcon />}
        onClick={onReveal}
        sx={{ ml: 3 }}
        disabled={disabled}>
        Reveal
      </Button>
    </Tooltip>
  );
}
