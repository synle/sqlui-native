import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import QueryResultContainer from 'src/components/QueryResultContainer';
import Tabs from 'src/components/Tabs';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DropdownButton from 'src/components/DropdownButton';
import {
  useExecute,
  useConnectionQueries,
  useConnectionQuery,
  getExportedQuery,
  useActiveConnectionQuery,
} from 'src/hooks';
import { SqluiFrontend } from 'typings';
import { useActionDialogs } from 'src/components/ActionDialogs';
import { useCommands } from 'src/components/MissionControl';
import { downloadText } from 'src/data/file';

export default function QueryResultTabs() {
  const navigate = useNavigate();
  const [init, setInit] = useState(false);
  const { queries, isLoading } = useConnectionQueries();
  const { selectCommand } = useCommands();

  const onShowQuery = async (query: SqluiFrontend.ConnectionQuery) =>
    selectCommand({ event: 'clientEvent/query/show', data: query });
  const onAddQuery = () => selectCommand({ event: 'clientEvent/query/new' });

  const onCloseQuery = async (query: SqluiFrontend.ConnectionQuery) =>
    selectCommand({ event: 'clientEvent/query/close', data: query });

  const onCloseOtherQueries = async (query: SqluiFrontend.ConnectionQuery) =>
    selectCommand({ event: 'clientEvent/query/closeOther', data: query });

  const onRenameQuery = async (query: SqluiFrontend.ConnectionQuery) =>
    selectCommand({ event: 'clientEvent/query/rename', data: query });

  const onDuplicateQuery = async (query: SqluiFrontend.ConnectionQuery) =>
    selectCommand({ event: 'clientEvent/query/duplicate', data: query });

  const onExportQuery = async (query: SqluiFrontend.ConnectionQuery) =>
    selectCommand({ event: 'clientEvent/query/export', data: query });

  // add a dummy query to start
  useEffect(() => {
    if (!init && !isLoading) {
      if (queries?.length === 0) {
        onAddQuery();
      }
      setInit(true);
    }
  }, [isLoading, queries, init]);

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (!queries || queries.length === 0) {
    return (
      <Alert severity='info'>
        No Query Yet.{' '}
        <Link onClick={() => onAddQuery()} underline='none' sx={{ cursor: 'pointer' }}>
          Click here to add a new query.
        </Link>
      </Alert>
    );
  }

  const tabIdx = queries.findIndex((q) => q.selected === true) || 0;
  const tabHeaders: React.ReactNode[] = [
    ...queries.map((q, idx) => {
      const options = [
        {
          label: 'Rename',
          onClick: () => onRenameQuery(q),
          startIcon: <EditIcon />,
        },
        {
          label: 'Export',
          onClick: () => onExportQuery(q),
          startIcon: <ArrowUpwardIcon />,
        },
        {
          label: 'Duplicate',
          onClick: () => onDuplicateQuery(q),
          startIcon: <ContentCopyIcon />,
        },
        {
          label: 'Close',
          onClick: () => onCloseQuery(q),
          startIcon: <CloseIcon />,
        },
        {
          label: 'Close Other Tabs',
          onClick: () => onCloseOtherQueries(q),
          startIcon: <CloseIcon />,
        },
      ];
      return (
        <>
          {q.name}
          <DropdownButton id='table-action-split-button' options={options}>
            <ArrowDropDownIcon fontSize='small' />
          </DropdownButton>
        </>
      );
    }),
    <>
      <AddIcon fontSize='small' aria-label='Add query' /> Add Query
    </>,
  ];
  const tabContents = queries.map((q) => <QueryResultContainer key={q.id} queryId={q.id} />);

  return (
    <Tabs
      tabIdx={tabIdx}
      tabHeaders={tabHeaders}
      tabContents={tabContents}
      onTabChange={(newTabIdx) => {
        if (newTabIdx < queries.length) {
          onShowQuery(queries[newTabIdx]);
        } else {
          onAddQuery();
        }
      }}></Tabs>
  );
}
