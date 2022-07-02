import AddCircleIcon from '@mui/icons-material/AddCircle';
import BackupIcon from '@mui/icons-material/Backup';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import HelpIcon from '@mui/icons-material/Help';
import SendIcon from '@mui/icons-material/Send';
import { Button } from '@mui/material';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import { useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useMemo, useState, useRef } from 'react';
import { getSyntaxModeByDialect } from 'src/common/adapters/DataScriptFactory';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';
import { useCommands } from 'src/frontend/components/MissionControl';
import ConnectionDatabaseSelector from 'src/frontend/components/QueryBox/ConnectionDatabaseSelector';
import ConnectionRevealButton from 'src/frontend/components/QueryBox/ConnectionRevealButton';
import ResultBox from 'src/frontend/components/ResultBox';
import {
  refreshAfterExecution,
  useExecute,
  useGetConnectionById,
} from 'src/frontend/hooks/useConnection';
import { useConnectionQuery } from 'src/frontend/hooks/useConnectionQuery';
import useToaster from 'src/frontend/hooks/useToaster';
import { formatDuration, formatJS, formatSQL } from 'src/frontend/utils/formatter';
import { SqluiCore } from 'typings';

type QueryBoxProps = {
  queryId: string;
};

export default function QueryBox(props: QueryBoxProps) {
  const { queryId } = props;
  const editorRef = useRef(null);
  const { query, onChange, onDelete, isLoading: loadingConnection } = useConnectionQuery(queryId);
  const { mutateAsync: executeQuery } = useExecute();
  const [executing, setExecuting] = useState(false);
  const { data: selectedConnection } = useGetConnectionById(query?.connectionId);
  const queryClient = useQueryClient();
  const { selectCommand } = useCommands();
  const { add: addToast } = useToaster();
  const navigate = useNavigate();

  const isLoading = loadingConnection;

  const language: string = useMemo(
    () => getSyntaxModeByDialect(selectedConnection?.dialect),
    [selectedConnection?.dialect, query?.sql],
  );

  const isExecuteDisabled = executing || !query?.sql || !query?.connectionId;

  const isMigrationVisible = !!query?.connectionId && !!query?.databaseId;
  const isCreateRecordVisible = isMigrationVisible;

  const onDatabaseConnectionChange = useCallback(
    (connectionId?: string, databaseId?: string, tableId?: string) => {
      onChange({ connectionId, databaseId, tableId });
    },
    [onChange],
  );

  const onSqlQueryChange = useCallback(
    (newQuery: string) => {
      onChange({ sql: newQuery });
    },
    [onChange],
  );

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
    if (!query) {
      return;
    }

    e.preventDefault();
    setExecuting(true);

    const executionStart = Date.now();
    onChange({ executionStart, result: {} as SqluiCore.Result });

    let success = false;

    const queryToExecute = {
      ...query
    }

    // here we attempted to pull in the highlighted text
    try{
      // TODO: find out a more reliable way to get a model based on an id
      //@ts-ignore
      const sql = editorRef.current.getSelectedText();

      if(sql){
        queryToExecute.sql = sql;
      }
    } catch(err){}

    try {
      const newResult = await executeQuery(queryToExecute);
      onChange({ result: newResult });
      refreshAfterExecution(queryToExecute, queryClient);

      success = newResult.ok;
    } catch (err) {
      // here query failed...
    }
    setExecuting(false);

    const executionEnd = Date.now();
    onChange({ executionEnd });

    await addToast({
      message: `Query "${queryToExecute.name}" executed ${
        success ? 'successfully' : 'unsuccessfully'
      } and took about ${formatDuration(executionEnd - executionStart)}...`,
    });
  };

  const onShowMigrationForThisDatabaseAndTable = () => {
    navigate(
      `/migration/real_connection?connectionId=${query?.connectionId || ''}&databaseId=${
        query?.databaseId || ''
      }&tableId=${query?.tableId || ''}`,
    );
  };

  const onShowCreateNewRecordForThisDatabaseAndTable = () => {
    navigate(
      `/record/new?connectionId=${query?.connectionId || ''}&databaseId=${
        query?.databaseId || ''
      }&tableId=${query?.tableId || ''}`,
    );
  };

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
          editorRef={editorRef}
          autoFocus
        />
        <div className='FormInput__Row'>
          <Button
            id='btnExecuteCommand'
            type='submit'
            variant='contained'
            disabled={isExecuteDisabled}
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
          {isMigrationVisible && (
            <Tooltip title='Migrate this database and table.'>
              <Button
                type='button'
                variant='outlined'
                onClick={onShowMigrationForThisDatabaseAndTable}
                startIcon={<BackupIcon />}>
                Migration
              </Button>
            </Tooltip>
          )}
          {isCreateRecordVisible && (
            <Tooltip title='Create new record for this database and connection.'>
              <Button
                type='button'
                variant='outlined'
                onClick={onShowCreateNewRecordForThisDatabaseAndTable}
                startIcon={<AddCircleIcon />}>
                New Record
              </Button>
            </Tooltip>
          )}
        </div>
        <ResultBox query={query} executing={executing} />
      </form>
    </>
  );
}
