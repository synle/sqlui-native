import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { format as formatSQL } from 'sql-formatter';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PreviewIcon from '@mui/icons-material/Preview';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import {
  useGetConnections,
  useExecute,
  useConnectionQueries,
  useConnectionQuery,
  useShowHide,
  useGetDatabases,
  useGetConnectionById,
  refreshAfterExecution,
} from 'src/hooks';
import { useCommands } from 'src/components/MissionControl';
import CodeEditorBox from 'src/components/CodeEditorBox';
import ResultBox from 'src/components/ResultBox';
import Select from 'src/components/Select';
import { SqluiCore, SqluiFrontend } from 'typings';
import ConnectionDatabaseSelector from 'src/components/QueryBox/ConnectionDatabaseSelector';
import ConnectionRevealButton from 'src/components/QueryBox/ConnectionRevealButton';

const formatJS = require('js-beautify').js;

interface QueryBoxProps {
  queryId: string;
}

export default function QueryBox(props: QueryBoxProps) {
  const { queryId } = props;
  const { query, onChange, onDelete, isLoading: loadingConnection } = useConnectionQuery(queryId);
  const { mutateAsync: executeQuery } = useExecute();
  const [executing, setExecuting] = useState(false);
  const { data: selectedConnection } = useGetConnectionById(query?.connectionId);
  const queryClient = useQueryClient();

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
    let { sql } = query;
    sql = sql || '';

    switch (selectedConnection?.dialect) {
      case 'mssql':
      case 'postgres':
      case 'sqlite':
      case 'mariadb':
      case 'mysql':
        sql = formatSQL(sql);
        break;
      case 'mongodb':
        sql = formatJS(sql, {
          indent_size: 2,
          space_in_empty_paren: true,
          break_chained_methods: 2,
        });
        break;
    }

    onChange({ sql });
  };

  const onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setExecuting(true);
    onChange({ executionStart: Date.now(), result: {} as SqluiCore.Result });

    try {
      const newResult = await executeQuery(query);
      onChange({ result: newResult });
      refreshAfterExecution(query, queryClient);
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
        <div className='FormInput__Row'>
          <ConnectionDatabaseSelector value={query} onChange={onDatabaseConnectionChange} />
          <ConnectionRevealButton query={query} />
        </div>
        <div className='FormInput__Row'>
          <CodeEditorBox
            value={query.sql}
            placeholder={`Enter SQL for ` + query.name}
            onChange={onSqlQueryChange}
            language='sql'
            autoFocus
            mode='textarea'
          />
        </div>
        <div className='FormInput__Row'>
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
