import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import HelpIcon from '@mui/icons-material/Help';
import SendIcon from '@mui/icons-material/Send';
import { Button } from '@mui/material';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { useQueryClient } from 'react-query';
import { useState } from 'react';
import React from 'react';
import CodeEditorBox from 'src/components/CodeEditorBox';
import { useCommands } from 'src/components/MissionControl';
import ConnectionDatabaseSelector from 'src/components/QueryBox/ConnectionDatabaseSelector';
import ConnectionRevealButton from 'src/components/QueryBox/ConnectionRevealButton';
import ResultBox from 'src/components/ResultBox';
import Select from 'src/components/Select';
import { refreshAfterExecution } from 'src/hooks/useConnection';
import { useConnectionQuery } from 'src/hooks/useConnectionQuery';
import { useExecute } from 'src/hooks/useConnection';
import { useGetConnectionById } from 'src/hooks/useConnection';
import { formatJS } from 'src/utils/formatter';
import { formatSQL } from 'src/utils/formatter';
import { SqluiCore } from 'typings';

type QueryBoxProps = {
  queryId: string;
};

export default function QueryBox(props: QueryBoxProps) {
  const { queryId } = props;
  const { query, onChange, onDelete, isLoading: loadingConnection } = useConnectionQuery(queryId);
  const { mutateAsync: executeQuery } = useExecute();
  const [executing, setExecuting] = useState(false);
  const { data: selectedConnection } = useGetConnectionById(query?.connectionId);
  const queryClient = useQueryClient();
  const { selectCommand } = useCommands();

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
      default:
        sql = formatSQL(sql);
        break;
      case 'mongodb':
      case 'redis':
        sql = formatJS(sql);
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
      // here query failed...
    }
    setExecuting(false);
    onChange({ executionEnd: Date.now() });
  };

  const disabledExecute = executing || !query?.sql || !query?.connectionId;

  let language: string = '';
  if (selectedConnection && selectedConnection.dialect) {
    switch (selectedConnection.dialect) {
      default:
        language = 'sql';
        break;
      case 'mongodb':
      case 'redis':
        language = 'js';
        break;
    }
  }

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
            language={language}
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

          <Tooltip title='Click here to see how to get started with some queries.'>
            <Button
              type='button'
              variant='outlined'
              onClick={() => selectCommand({ event: 'clientEvent/showQueryHelp' })}
              startIcon={<HelpIcon />}
              sx={{ ml: 3 }}>
              Show Query Help
            </Button>
          </Tooltip>

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
