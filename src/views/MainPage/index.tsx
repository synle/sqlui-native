import React, { useState, createRef, useEffect } from 'react';
import NewConnectionButton from 'src/components/NewConnectionButton';
import ConnectionDescription from 'src/components/ConnectionDescription';
import QueryResultTabs from 'src/components/QueryResultTabs';
import Resizer from 'src/components/Resizer';

export default function MainPage() {
  const [width, setWidth] = useState<undefined | number>();

  return (
    <section className='MainPage'>
      <div className='MainPage__LeftPane' style={{ width }}>
        <NewConnectionButton />
        <ConnectionDescription />
      </div>
      <Resizer onSetWidth={setWidth} />
      <div className='MainPage__RightPane'>
        <QueryResultTabs />
      </div>
    </section>
  );
}
