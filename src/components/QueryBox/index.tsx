import React, { useState, useEffect } from 'react';
import { format } from 'sql-formatter';
import Typography from '@mui/material/Typography';
import { Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import NativeSelect from '@mui/material/NativeSelect';
import CodeEditor from '@uiw/react-textarea-code-editor';
import PreviewIcon from '@mui/icons-material/Preview';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import Tooltip from '@mui/material/Tooltip';
import {
  useExecute,
  useConnectionQueries,
  useConnectionQuery,
  useGetAvailableDatabaseConnections,
  useGetMetaData,
  useShowHide,
} from 'src/hooks';
import { SqluiCore, SqluiFrontend } from 'typings';

interface QueryBoxProps {
  queryId: string;
}

export default function QueryBox(props: QueryBoxProps) {
  const { queryId } = props;
  const { data: connections, isLoading: loadingMetaData } = useGetMetaData();
  const {
    query,
    onChange,
    onDelete,
    isLoading: loadingConnection,
    onExecute,
  } = useConnectionQuery(queryId);
  const connectionsMetaData = useGetAvailableDatabaseConnections(connections);
  const { isLoading: executing } = useExecute(query);

  const isLoading = loadingMetaData || loadingConnection;

  if (isLoading) {
    return <>loading...</>;
  }

  if (!query) {
    return null;
  }

  const onDatabaseConnectionChange = (newValue: string) => {
    if (!connectionsMetaData) {
      return;
    }

    const matched = connectionsMetaData.find((connMetaData) => connMetaData.id === newValue);

    onChange('connectionId', matched?.connectionId);
    onChange('databaseId', matched?.databaseId);
  };

  const onSqlQueryChange = (newQuery: string) => {
    onChange('sql', newQuery);
  };

  const onFormatQuery = () => {
    onChange('sql', format(query?.sql));
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
        <ConnectionDatabaseSelector
          value={query}
          onChange={onDatabaseConnectionChange}
          options={connectionsMetaData}
        />
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
  onChange: (newValue: string) => void;
  options?: SqluiFrontend.AvailableConnectionProps[];
}

function ConnectionDatabaseSelector(props: ConnectionDatabaseSelectorProps) {
  const query = props.value;
  const value = [query.connectionId, query.databaseId].join(' << ');

  return (
    <NativeSelect value={value} onChange={(e) => props.onChange(e.target.value)} required>
      <option value=''>Pick One</option>
      {props.options?.map((connMetaData) => (
        <option key={`${connMetaData.id}`} value={`${connMetaData.id}`}>
          {connMetaData.label}
        </option>
      ))}
    </NativeSelect>
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

    if (databaseId && connectionId) {
      const branchesToReveal: string[] = [connectionId, [connectionId, databaseId].join(' > ')];

      for (const branchToReveal of branchesToReveal) {
        // reveal
        onToggle(branchToReveal, true);
      }
    }
  };

  if (!query) {
    return null;
  }

  return (
    <Tooltip title='Reveal this Connection on the connection tree.'>
      <Button
        type='button'
        variant='outlined'
        startIcon={<PreviewIcon />}
        onClick={onReveal}
        sx={{ ml: 3 }}>
        Reveal
      </Button>
    </Tooltip>
  );
}
