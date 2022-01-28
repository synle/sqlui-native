import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import QueryResultContainer from 'src/components/QueryResultContainer';
import Tabs from 'src/components/Tabs';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';

export default function QueryResultTabs() {
  const { queries, onAddQuery, onShowQuery, onChangeQuery, isLoading } = useConnectionQueries();

  const onAddTab = () => {
    onAddQuery();
  };

  const onTabChange = (queryId: string) => {
    onShowQuery(queryId);
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
  const tabHeaders: string[] = [...queries.map((q, idx) => q.name), 'Add Query'];
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
