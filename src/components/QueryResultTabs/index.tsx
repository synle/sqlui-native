import { useState } from 'react';
import QueryResultContainer from 'src/components/QueryResultContainer';
import Tabs from 'src/components/Tabs';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';

export default function QueryResultTabs() {
  const { queries, onAddQuery, isLoading } = useConnectionQueries();
  const [tabIdx, setTabIdx] = useState(0);

  if (isLoading) {
    return <>loading...</>;
  }

  if (!queries) {
    return null;
  }

  const onAddTab = () => {
    onAddQuery();
    setTabIdx(queries.length + 1);
  };

  const onTabChange = (idx: number) => {
    setTabIdx(idx)
  }

  const tabHeaders = [
    ...queries.map((q, idx) => (
      <button key={q.id} onClick={() => onTabChange(idx)}>
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
