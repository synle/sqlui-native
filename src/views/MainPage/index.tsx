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
        <h1>MainPage</h1>
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

  if (isLoading) {
    return <>loading...</>;
  }

  if (!queries) {
    return null;
  }

  const tabHeaders = queries.map((q) => <button key={q.id}>{q.name}</button>);
  const tabContents = queries.map((q) => <QueryResultContainer key={q.id} queryId={q.id} />);

  return (
    <Tabs>
      <nav>
        {tabHeaders}
        <button type='button' onClick={onAddQuery}>
          Add Query
        </button>
      </nav>
      <div>{tabContents}</div>
    </Tabs>
  );
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
