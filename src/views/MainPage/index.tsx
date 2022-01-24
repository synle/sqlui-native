import React from 'react';

import NewConnectionButton from 'src/components/NewConnectionButton';
import QueryBox from 'src/components/QueryBox';
import ConnectionExplorer from 'src/components/ConnectionExplorer';
import ResultBox from 'src/components/ResultBox';

export default function MainPage() {
  return (
    <div>
      <div>
        <h1>MainPage</h1>
      </div>
      <ConnectionExplorer />
      <NewConnectionButton />
      <QueryBox />
      <ResultBox />
    </div>
  );
}
