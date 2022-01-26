import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

import CodeEditor from '@uiw/react-textarea-code-editor';
import {
  useExecute,
  useConnectionQueries,
  useConnectionQuery,
  useGetAvailableDatabaseConnections,
  useGetMetaData,
} from 'src/hooks';

interface QueryBoxProps {
  queryId: string;
}

export default function QueryBox(props: QueryBoxProps) {
  const { queryId } = props;
  const { data: connections, isLoading: loadingMetaData } = useGetMetaData();
  const { query, onChange, isLoading: loadingConnection, onExecute } = useConnectionQuery(queryId);
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

  const onSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onExecute();
  };

  const disabledExecute = executing || !query?.sql || !query?.connectionId;

  return (
    <form className='QueryBox' onSubmit={onSubmit}>
      <div className='QueryBox__Row'>
        <select
          value={[query.connectionId, query.databaseId].join(' << ')}
          onChange={(e) => onDatabaseConnectionChange(e.target.value)}
          required>
          <option value=''>Pick One</option>
          {(connectionsMetaData || []).map((connMetaData) => (
            <option key={`${connMetaData.id}`} value={`${connMetaData.id}`}>
              {connMetaData.label}
            </option>
          ))}
        </select>
      </div>
      <div className='QueryBox__Row'>
        <CodeEditor
          value={query.sql}
          language='sql'
          placeholder={`Enter SQL for ` + query.name}
          onBlur={(e) => onSqlQueryChange(e.target.value)}
          padding={10}
          minHeight={200}
          style={{
            backgroundColor: '#f5f5f5',
            border: 'none',
            fontFamily: 'monospace',
          }}
        />
      </div>
      <div className='QueryBox__ActionRow'>
        <Button type='submit' variant='contained' disabled={disabledExecute} endIcon={<SendIcon />}>
          Execute
        </Button>
      </div>
    </form>
  );
}
