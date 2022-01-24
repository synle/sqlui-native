import React from 'react';

import NewConnectionButton from 'src/components/NewConnectionButton';
import QueryBox from 'src/components/QueryBox';
import ConnectionDescription from 'src/components/ConnectionDescription';
import ResultBox from 'src/components/ResultBox';

export default function MainPage() {
  return (
    <div>
      <div>
        <h1>MainPage</h1>
      </div>
      <ConnectionDescription />
      <NewConnectionButton />
      <QueryBox />
      <ResultBox />
    </div>
  );
}
