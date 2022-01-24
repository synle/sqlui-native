import React from 'react';

import NewConnectionButton from 'src/components/NewConnectionButton';
import QueryBox from 'src/components/QueryBox';
import ConnectionDescription from 'src/components/ConnectionDescription';
import ResultBox from 'src/components/ResultBox';

export default function MainPage() {
  return (
    <div className='MainPage'>
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
        <QueryBox />
        <ResultBox />
      </div>
    </div>
  );
}
