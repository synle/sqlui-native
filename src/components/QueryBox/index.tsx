import React, { useState } from 'react';
import {
  useExecute,
  useConnectionQueries,
  useConnectionQuery,
  useGetAvailableDatabaseConnections,
} from 'src/hooks';

interface QueryBoxProps {
  queryId: string;
}

export default function QueryBox(props: QueryBoxProps) {
  const { queryId } = props;
  const { query, onChange, isLoading: loadingConnection, onExecute } = useConnectionQuery(queryId);
  const { data: connecionsMetaData, isLoading: loadingMetaData } =
    useGetAvailableDatabaseConnections();

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
          defaultValue={`${query.connectionId}.${query.databaseId}`}
          onBlur={(e) => onDatabaseConnectionChange(e.target.value)}
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
        <textarea
          defaultValue={query.sql}
          onBlur={(e) => onChange('sql', e.target.value)}
          placeholder={`Enter SQL for ` + query.name}
          required></textarea>
      </div>
      <div>
        <button type='submit'>Execute</button>
      </div>
    </form>
  );
}
