import AddCircleIcon from '@mui/icons-material/AddCircle';
import BackupIcon from '@mui/icons-material/Backup';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';
import MenuIcon from '@mui/icons-material/Menu';
import SendIcon from '@mui/icons-material/Send';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import LoadingButton from '@mui/lab/LoadingButton';
import { Button } from '@mui/material';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  getIsTableIdRequiredForQueryByDialect,
  getSyntaxModeByDialect,
  getTableActions,
} from 'src/common/adapters/DataScriptFactory';
import CodeEditorBox, { EditorRef } from 'src/frontend/components/CodeEditorBox';
import DropdownButton from 'src/frontend/components/DropdownButton';
import { useCommands } from 'src/frontend/components/MissionControl';
import ConnectionDatabaseSelector from 'src/frontend/components/QueryBox/ConnectionDatabaseSelector';
import ConnectionRevealButton from 'src/frontend/components/QueryBox/ConnectionRevealButton';
import ResultBox from 'src/frontend/components/ResultBox';
import {
  refreshAfterExecution,
  useExecute,
  useGetColumns,
  useGetConnectionById,
} from 'src/frontend/hooks/useConnection';
import { useConnectionQuery } from 'src/frontend/hooks/useConnectionQuery';
import { useLayoutModeSetting, useQuerySizeSetting } from 'src/frontend/hooks/useSetting';
import useToaster from 'src/frontend/hooks/useToaster';
import { formatDuration, formatJS, formatSQL } from 'src/frontend/utils/formatter';
import { SqluiCore } from 'typings';

type QueryBoxProps = {
  queryId: string;
};

type ConnectionActionsButtonProps = {
  query: SqluiCore.ConnectionQuery;
};

function ConnectionActionsButton(props: ConnectionActionsButtonProps): JSX.Element | null {
  const { query } = props;
  const { databaseId, connectionId, tableId } = query;
  const [open, setOpen] = useState(false);
  const querySize = useQuerySizeSetting();

  const { selectCommand } = useCommands();

  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(connectionId);
  const { data: columns, isLoading: loadingColumns } = useGetColumns(
    connectionId,
    databaseId,
    tableId,
  );

  const dialect = connection?.dialect;

  const isLoading = loadingConnection || loadingColumns;

  const isTableIdRequiredForQuery = getIsTableIdRequiredForQueryByDialect(dialect);

  const actions = getTableActions({
    dialect,
    connectionId,
    databaseId,
    tableId,
    columns: columns || [],
    querySize,
  });

  const options = actions.map((action) => ({
    label: action.label,
    startIcon: action.icon,
    onClick: async () =>
      action.query &&
      selectCommand({
        event: 'clientEvent/query/apply',
        data: {
          connectionId,
          databaseId,
          tableId: tableId,
          sql: action.query,
        },
        label: `Applied "${action.label}" to active query tab.`,
      }),
  }));

  if (!databaseId || !connectionId || !tableId) {
    return null;
  }

  return (
    <DropdownButton
      id='session-action-split-button'
      options={options}
      onToggle={(newOpen) => setOpen(newOpen)}
      isLoading={isLoading}
      maxHeight='400px'>
      <IconButton aria-label='Table Actions' color='inherit'>
        <MenuIcon fontSize='inherit' color='inherit' />
      </IconButton>
    </DropdownButton>
  );
}

const ALL_CODE_SNIPPETS: SqluiCore.LanguageMode[] = ['javascript', 'python', 'java'];

function CodeSnippetButton(props: QueryBoxProps) {
  const { queryId } = props;
  const { query } = useConnectionQuery(queryId);
  const { data: connection } = useGetConnectionById(query?.connectionId);
  const { selectCommand } = useCommands();

  if (!query) {
    return null;
  }

  const options = ALL_CODE_SNIPPETS.map((language) => ({
    label: language,
    onClick: async () =>
      selectCommand({
        event: 'clientEvent/query/showSampleCodeSnippet',
        data: {
          connection,
          language,
          query,
        },
      }),
  }));

  return (
    <DropdownButton id='session-action-split-button' options={options} maxHeight='400px'>
      <Button type='button' variant='outlined' startIcon={<InfoIcon />}>
        Show Code Snippet
      </Button>
    </DropdownButton>
  );
}

export default function QueryBox(props: QueryBoxProps): JSX.Element | null {
  const { queryId } = props;
  const editorRef = useRef<EditorRef>();
  const { query, onChange, onDelete, isLoading: loadingConnection } = useConnectionQuery(queryId);
  const { mutateAsync: executeQuery } = useExecute();
  const [executing, setExecuting] = useState(false);
  const layoutMode = useLayoutModeSetting();
  const [expanded, setExpanded] = useState(layoutMode !== 'compact');
  const { data: selectedConnection } = useGetConnectionById(query?.connectionId);
  const queryClient = useQueryClient();
  const { selectCommand } = useCommands();
  const { add: addToast } = useToaster();
  const navigate = useNavigate();

  const language: string = useMemo(
    () => getSyntaxModeByDialect(selectedConnection?.dialect),
    [selectedConnection?.dialect, query?.sql],
  );
  const isLoading = loadingConnection;
  const isExecuting = executing;
  const isMigrationVisible = !!query?.connectionId && !!query?.databaseId;
  const isCreateRecordVisible = isMigrationVisible;

  useLayoutEffect(() => {
    setExpanded(layoutMode !== 'compact');
  }, [layoutMode]);

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
      ...query,
    };

    // here we attempted to pull in the highlighted text
    try {
      const sql = editorRef?.current?.getSelectedText();

      if (sql) {
        queryToExecute.sql = sql;
      }
    } catch (err) {}

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
      <form
        className='QueryBox FormInput__Container'
        onSubmit={onSubmit}
        style={{ marginBottom: '1rem' }}>
        {expanded && (
          <div className='FormInput__Row'>
            <ConnectionDatabaseSelector value={query} onChange={onDatabaseConnectionChange} />
            <ConnectionRevealButton query={query} />
            <ConnectionActionsButton query={query} />
          </div>
        )}
        <CodeEditorBox
          id={query.id}
          className='CodeEditorBox__QueryBox'
          value={query.sql}
          placeholder={`Enter SQL for ` + query.name}
          onChange={onSqlQueryChange}
          language={language}
          editorRef={editorRef}
          autoFocus
          required
        />
        <div className='FormInput__Row'>
          {!expanded && (
            <div className='FormInput__Row'>
            <ConnectionDatabaseSelector value={query} onChange={onDatabaseConnectionChange} />
            <ConnectionRevealButton query={query} />
          </div>
          )}
          <LoadingButton
            id='btnExecuteCommand'
            type='submit'
            variant='contained'
            loading={isExecuting}
            startIcon={<SendIcon />}>
            Execute
          </LoadingButton>
          {expanded && (
            <>
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
              <CodeSnippetButton {...props} />
            </>
          )}
          <Tooltip title={expanded ? 'Collapse form' : 'Expand form'}>
            <IconButton
              aria-label='Toggle form collapse'
              color='inherit'
              onClick={() => setExpanded((prev) => !prev)}
              style={{ marginLeft: 'auto' }}>
              {expanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
            </IconButton>
          </Tooltip>
        </div>
      </form>
      <ResultBox query={query} executing={executing} collapsed={!expanded} />
    </>
  );
}
