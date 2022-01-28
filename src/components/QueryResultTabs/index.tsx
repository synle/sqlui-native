import React from 'react';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import QueryResultContainer from 'src/components/QueryResultContainer';
import Tabs from 'src/components/Tabs';
import AddIcon from '@mui/icons-material/Add';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';

export default function QueryResultTabs() {
  const { queries, onAddQuery, onShowQuery, onChangeQuery, onDeleteQuery, isLoading } =
    useConnectionQueries();

  const onAddTab = () => {
    onAddQuery();
  };

  const onTabChange = (queryId: string) => {
    onShowQuery(queryId);
  };

  const onDeleteTab = (e: React.SyntheticEvent, queryId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (confirm('Do you want to delete this query?')) {
      onDeleteQuery(queryId);
    }
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
    ...queries.map((q, idx) => (
      <>
        {q.name}
        <Tooltip title='Close this query'>
          <CloseIcon fontSize='small' onClick={(e) => onDeleteTab(e, q.id)} aria-label='Close query' />
        </Tooltip>
      </>
    )),
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
