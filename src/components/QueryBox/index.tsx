import React, { useState, useEffect } from 'react';
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
  const connecionsMetaData = useGetAvailableDatabaseConnections(connections);
  const { isLoading: executing } = useExecute(query);

  const isLoading = loadingMetaData || loadingConnection;

  if (isLoading) {
    return <>loading...</>;
  }

  if (!query) {
    return null;
  }

  const onDatabaseConnectionChange = (newValue: string) => {
    if (!connecionsMetaData) {
      return;
    }

    const matched = connecionsMetaData.find(
      (connMetaData) => `${connMetaData.connectionId}.${connMetaData.databaseId}` === newValue,
    );

    onChange('connectionId', matched?.connectionId);
    onChange('databaseId', matched?.databaseId);
  };

  const onSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onExecute();
  };

  return (
    <form className='QueryBox' onSubmit={onSubmit}>
      <div>
        <select
          value={`${query.connectionId}.${query.databaseId}`}
          onChange={(e) => onDatabaseConnectionChange(e.target.value)}
          required>
          <option value=''>Pick One</option>
          {(connecionsMetaData || []).map((connMetaData) => (
            <option key={`${connMetaData.id}`} value={`${connMetaData.id}`}>
              {connMetaData.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <CodeEditor
          value={query.sql}
          language='sql'
          placeholder={`Enter SQL for ` + query.name}
          onBlur={(e) => onChange('sql', e.target.value)}
          padding={10}
          minHeight={200}
          style={{
            backgroundColor: '#f5f5f5',
            border: 'none',
            fontFamily: 'monospace',
          }}
        />
      </div>
      <div>
        <button type='submit' disabled={executing}>
          Execute
        </button>
      </div>
    </form>
  );
}
