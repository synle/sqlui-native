import { useState } from 'react';

import NewConnectionButton from 'src/components/NewConnectionButton';
import QueryBox from 'src/components/QueryBox';
import ConnectionDescription from 'src/components/ConnectionDescription';
import ResultBox from 'src/components/ResultBox';
import Tabs from 'src/components/Tabs';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';

export default function MainPage() {
  return (
    <section className='MainPage'>
      <div className='MainPage__LeftPane'>
        <div>
          <NewConnectionButton />
        </div>
        <div>
          <ConnectionDescription />
        </div>
      </div>
      <div className='MainPage__RightPane'>
        <QueryResultTabs />
      </div>
    </section>
  );
}

// TODO: move this into a component
function QueryResultTabs() {
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

  const tabHeaders = [
    ...queries.map((q, idx) => (
      <button key={q.id} onClick={() => setTabIdx(idx)}>
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

interface QueryResultContainerProps {
  queryId: string;
}

function QueryResultContainer(props: QueryResultContainerProps) {
  const { queryId } = props;

  return (
    <>
      <QueryBox queryId={queryId} />
      <ResultBox queryId={queryId} />
    </>
  );
}
