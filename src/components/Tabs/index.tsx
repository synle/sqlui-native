import React, { useState } from 'react';

import NewConnectionButton from 'src/components/NewConnectionButton';
import QueryBox from 'src/components/QueryBox';
import ConnectionDescription from 'src/components/ConnectionDescription';
import ResultBox from 'src/components/ResultBox';
import { useExecute } from 'src/hooks';

interface TabsProps {
  tabIdx: number;
  tabHeaders: React.ReactNode[];
  tabContents: React.ReactNode[];
}

export default function Tabs(props: TabsProps) {
  const { tabIdx, tabHeaders, tabContents } = props;

  const visibleTab = tabContents[tabIdx];

  return (
    <section className='Tabs'>
      <nav>{tabHeaders}</nav>
      <div>{tabContents[tabIdx]}</div>
    </section>
  );
}
