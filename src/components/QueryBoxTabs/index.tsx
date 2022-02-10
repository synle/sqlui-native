import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import React from 'react';
import { allMenuKeys } from 'src/components/MissionControl';
import { SqluiFrontend } from 'typings';
import { useCommands } from 'src/components/MissionControl';
import { useConnectionQueries } from 'src/hooks';
import { useQueryTabOrientationSetting } from 'src/hooks';
import DropdownButton from 'src/components/DropdownButton';
import QueryBox from 'src/components/QueryBox';
import Tabs from 'src/components/Tabs';
export default function QueryBoxTabs() {
  const navigate = useNavigate();
  const [init, setInit] = useState(false);
  const { queries, isLoading } = useConnectionQueries();
  const { selectCommand } = useCommands();
  const queryTabOrientation = useQueryTabOrientationSetting();

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

  // this section is specific to electron
  // we only want to show the query menu for
  // electron only when we can see the query tabs...
  useEffect(() => {
    //@ts-ignore
    window.toggleElectronMenu(true, allMenuKeys);

    return () => {
      //@ts-ignore
      window.toggleElectronMenu(false, allMenuKeys);
    };
  }, []);

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
  const tabContents = queries.map((q) => <QueryBox key={q.id} queryId={q.id} />);

  return (
    <Tabs
      tabIdx={tabIdx}
      tabHeaders={tabHeaders}
      tabContents={tabContents}
      orientation={queryTabOrientation}
      onTabChange={(newTabIdx) => {
        if (newTabIdx < queries.length) {
          onShowQuery(queries[newTabIdx]);
        } else {
          onAddQuery();
        }
      }}></Tabs>
  );
}
