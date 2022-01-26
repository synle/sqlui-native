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

  const tabHeaders = [
    ...queries.map((q, idx) => (
      <button
        key={q.id}
        onClick={() => onShowQuery(q.id)}
        onDoubleClick={() => onRenameQuery(q.id, q.name)}
        aria-selected={q.selected}>
        {q.name}
      </button>
    )),
    <button type='button' onClick={onAddQuery} key='addquery'>
      Add Query
    </button>,
  ];

  const tabContents = queries.map((q) => <QueryResultContainer key={q.id} queryId={q.id} />);

  return <Tabs tabIdx={tabIdx} tabHeaders={tabHeaders} tabContents={tabContents}></Tabs>;
}
