import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import HelpIcon from '@mui/icons-material/Help';
import SendIcon from '@mui/icons-material/Send';
import { Button } from '@mui/material';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { useQueryClient } from 'react-query';
import React, { useState, useMemo, useCallback} from 'react';
import CodeEditorBox from 'src/components/CodeEditorBox';
import { useCommands } from 'src/components/MissionControl';
import ConnectionDatabaseSelector from 'src/components/QueryBox/ConnectionDatabaseSelector';
import ConnectionRevealButton from 'src/components/QueryBox/ConnectionRevealButton';
import ResultBox from 'src/components/ResultBox';
import { refreshAfterExecution, useExecute, useGetConnectionById } from 'src/hooks/useConnection';
import { useConnectionQuery } from 'src/hooks/useConnectionQuery';
import useToaster from 'src/hooks/useToaster';
import { formatDuration, formatJS, formatSQL } from 'src/utils/formatter';
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
  const { add: addToast } = useToaster();

  const isLoading = loadingConnection;

  const language: string = useMemo(() => {
    switch (selectedConnection?.dialect) {
      default:
        return 'sql';
      case 'mongodb':
      case 'redis':
        return'javascript';
    }
  },[selectedConnection?.dialect])

  const onDatabaseConnectionChange = useCallback((connectionId?: string, databaseId?: string) => {
    onChange({ connectionId: connectionId, databaseId: databaseId });
  },[onChange]);

  const onSqlQueryChange = useCallback((newQuery: string) => {
    onChange({ sql: newQuery });
  },[onChange]);

  const onFormatQuery = () => {
    if (!query || (query && query.sql && query.sql.length > 20000)) {
      // this is too large for the library to handle
      // let's stop it
      return;
    }
    let { sql } = query;
    sql = sql || '';

    switch (language) {
      case 'sql':
        sql = formatSQL(sql);
        break;
      case 'javascript':
        sql = formatJS(sql);
        break;
    }

    onChange({ sql });
  };

  const onSubmit = async (e: React.SyntheticEvent) => {
    if(!query){
      return;
    }

    e.preventDefault();
    setExecuting(true);

    const executionStart = Date.now();
    onChange({ executionStart, result: {} as SqluiCore.Result });

    let success = false;

    try {
      const newResult = await executeQuery(query);
      onChange({ result: newResult });
      refreshAfterExecution(query, queryClient);

      success = newResult.ok;
    } catch (err) {
      // here query failed...
    }
    setExecuting(false);

    const executionEnd = Date.now();
    onChange({ executionEnd });

    await addToast({
      message: `Query "${query.name}" executed ${
        success ? 'Successfully' : 'Unsuccessfully'
      } and took about ${formatDuration(executionEnd - executionStart)}...`,
    });
  };

  const disabledExecute = executing || !query?.sql || !query?.connectionId;

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

  return (
    <>
      <form className='QueryBox FormInput__Container' onSubmit={onSubmit}>
        <div className='FormInput__Row'>
          <ConnectionDatabaseSelector value={query} onChange={onDatabaseConnectionChange} />
          <ConnectionRevealButton query={query} />
        </div>
        <CodeEditorBox
          value={query.sql}
          placeholder={`Enter SQL for ` + query.name}
          onChange={onSqlQueryChange}
          language={language}
          autoFocus
          mode='textarea'
        />
        <div className='FormInput__Row'>
          <Button
            id='btnExecuteCommand'
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
              startIcon={<HelpIcon />}>
              Show Query Help
            </Button>
          </Tooltip>

          <Tooltip title='Format the SQL query for readability.'>
            <Button
              type='button'
              variant='outlined'
              onClick={onFormatQuery}
              startIcon={<FormatColorTextIcon />}>
              Format
            </Button>
          </Tooltip>
        </div>
        <ResultBox query={query} executing={executing} />
      </form>
    </>
  );
}
