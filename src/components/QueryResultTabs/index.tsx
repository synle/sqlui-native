import QueryResultContainer from 'src/components/QueryResultContainer';
import Tabs from 'src/components/Tabs';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';

export default function QueryResultTabs() {
  const { queries, onAddQuery, onShowQuery, onChangeQuery, isLoading } = useConnectionQueries();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!queries) {
    return null;
  }

  const onAddTab = () => {
    onAddQuery();
  };

  const onTabChange = (queryId: string) => {
    onShowQuery(queryId);
  };

  const onRenameQuery = (queryId: string, oldName: string) => {
    const newName = prompt('Rename Query?', oldName);
    if (newName) {
      onChangeQuery(queryId, 'name', newName);
    }
  };

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
