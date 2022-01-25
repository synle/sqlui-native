import React from 'react';

import NewConnectionButton from 'src/components/NewConnectionButton';
import QueryBox from 'src/components/QueryBox';
import ConnectionDescription from 'src/components/ConnectionDescription';
import ResultBox from 'src/components/ResultBox';
import { useExecute } from 'src/hooks';

export default function MainPage() {
  // TODO hard coded here for now
  const { data: connections, isLoading } = useExecute();

  const onExecute = (sql: string) => {
    alert(sql);
  };

  const queryResult = null;

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
        <QueryBox onExecute={onExecute} />
        <ResultBox queryResult={queryResult} />
      </div>
    </section>
  );
}
