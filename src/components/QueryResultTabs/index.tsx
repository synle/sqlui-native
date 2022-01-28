import React from 'react';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import QueryResultContainer from 'src/components/QueryResultContainer';
import Tabs from 'src/components/Tabs';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DropdownButton from 'src/components/DropdownButton';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';
import { SqluiNative } from 'typings';
import { useActionDialogs } from 'src/components/ActionDialogs';

export default function QueryResultTabs() {
  const { queries, onAddQuery, onShowQuery, onChangeQuery, onDeleteQueries, isLoading } =
    useConnectionQueries();
  const { confirm, prompt } = useActionDialogs();

  const onAddTab = () => {
    onAddQuery();
  };

  const onTabChange = (queryId: string) => {
    onShowQuery(queryId);
  };

  const onCloseQuery = async (query: SqluiNative.ConnectionQuery) => {
    await confirm('Do you want to delete this query?');
    onDeleteQueries([query.id]);
  };

  const onCloseOtherQueries = async (query: SqluiNative.ConnectionQuery) => {
    await confirm('Do you want to close other queries?');
    onDeleteQueries(queries?.map(q => q.id).filter(queryId => queryId !== query.id))
  };


  const onRenameQuery = async (query: SqluiNative.ConnectionQuery) => {
    const newName = await prompt('Rename Query?', query.name);
    onChangeQuery(query.id, 'name', newName);
  };

  if (isLoading) {
    return <>loading...</>;
  }

  if (!queries || queries.length === 0) {
    return (
      <Alert severity='info'>
        No Query Yet.{' '}
        <Link onClick={onAddTab} underline='none' sx={{ cursor: 'pointer' }}>
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
        },
        {
          label: 'Close',
          onClick: () => onCloseQuery(q),
        },
        {
          label: 'Close Other Tabs',
          onClick: () => onCloseOtherQueries(q),
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
          onTabChange(queries[newTabIdx].id);
        } else {
          onAddTab();
        }
      }}></Tabs>
  );
}
