import React, { useEffect, useState } from 'react';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
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
import { useExecute, useConnectionQueries, useConnectionQuery, getExportedQuery } from 'src/hooks';
import { SqluiFrontend } from 'typings';
import { useActionDialogs } from 'src/components/ActionDialogs';
import { useCommands } from 'src/components/MissionControl';
import { downloadText } from 'src/data/file';

export default function QueryResultTabs() {
  const [init, setInit] = useState(false);
  const {
    queries,
    onAddQuery,
    onShowQuery,
    onChangeQuery,
    onDeleteQueries,
    onDuplicateQuery,
    isLoading,
  } = useConnectionQueries();
  const { command, dismissCommand } = useCommands();
  const { confirm, prompt } = useActionDialogs();

  const onCloseQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      await confirm('Do you want to delete this query?');
      onDeleteQueries([query.id]);
    } catch (err) {
      //@ts-ignore
    }
  };

  const onCloseOtherQueries = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      await confirm('Do you want to close other queries?');
      onDeleteQueries(queries?.map((q) => q.id).filter((queryId) => queryId !== query.id));
    } catch (err) {
      //@ts-ignore
    }
  };

  const onRenameQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      const newName = await prompt({
        message: 'New Query Name',
        defaultValue: query.name,
        saveLabel: 'Save',
      });
      onChangeQuery(query.id, 'name', newName);
    } catch (err) {
      //@ts-ignore
    }
  };

  const onDuplicate = async (query: SqluiFrontend.ConnectionQuery) => {
    onDuplicateQuery(query.id);
  };

  const onExportQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    downloadText(
      `${query.name}.query.json`,
      JSON.stringify([getExportedQuery(query)], null, 2),
      'text/json',
    );
  };

  // mission control commands
  useEffect(() => {
    if (command) {
      dismissCommand();

      switch (command.event) {
        case 'clientEvent.newQuery':
          onAddQuery();
          break;
      }
    }
  }, [command]);

  // add a dummy query to start
  useEffect(() => {
    if (!init) {
      if (queries?.length === 0) {
        onAddQuery();
        setInit(true);
      }
    }
  }, [queries, init]);

  if (isLoading) {
    return <Alert severity='info'>Loading...</Alert>;
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
          onClick: () => onDuplicate(q),
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
          onShowQuery(queries[newTabIdx].id);
        } else {
          onAddQuery();
        }
      }}></Tabs>
  );
}
