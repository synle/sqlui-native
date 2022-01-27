import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import NewConnectionButton from 'src/components/NewConnectionButton';
import QueryBox from 'src/components/QueryBox';
import ConnectionDescription from 'src/components/ConnectionDescription';
import ResultBox from 'src/components/ResultBox';
import { useExecute } from 'src/hooks';

interface TabsProps {
  tabIdx: number;
  onTabChange: (newTabIdx: number) => void;
  tabHeaders: string[];
  tabContents: React.ReactNode[];
}

export default function MyTabs(props: TabsProps) {
  const { tabIdx, tabHeaders, tabContents } = props;

  const visibleTab = tabContents[tabIdx];

  const onTabChange = (newTabIdx: number) => {
    props.onTabChange && props.onTabChange(newTabIdx);
  };

  return (
    <section className='Tabs'>
      <Tabs
        value={tabIdx}
        onChange={(_e, newTabIdx) => onTabChange(newTabIdx)}
        variant='scrollable'
        aria-label='Tabs'>
        {tabHeaders.map((tabHeader, idx) => (
          <Tab key={idx} label={tabHeader}></Tab>
        ))}
      </Tabs>
      <div>{tabContents[tabIdx]}</div>
    </section>
  );
}
