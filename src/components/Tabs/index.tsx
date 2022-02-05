import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import QueryBox from 'src/components/QueryBox';
import ConnectionDescription from 'src/components/ConnectionDescription';
import ResultBox from 'src/components/ResultBox';
import { useExecute } from 'src/hooks';

const VERTICAL_TAB_THRESHOLD = 20;

interface TabsProps {
  tabIdx: number;
  onTabChange: (newTabIdx: number) => void;
  tabHeaders: string[] | React.ReactNode[];
  tabContents: React.ReactNode[];
  orientation?: 'vertical' | 'horizontal';
}

export default function MyTabs(props: TabsProps) {
  const { tabIdx, tabHeaders, tabContents } = props;
  let {orientation} = props;

  const visibleTab = tabContents[tabIdx];

  const onTabChange = (newTabIdx: number) => {
    props.onTabChange && props.onTabChange(newTabIdx);
  };

  if(!orientation){
    orientation = tabHeaders.length > VERTICAL_TAB_THRESHOLD ? 'vertical' : 'horizontal'
  }

  return (
    <section className={orientation === 'vertical' ? 'Tabs Tabs__Vertical' : 'Tabs Tabs__Horizontal'}>
      <Tabs
        value={tabIdx}
        onChange={(_e, newTabIdx) => onTabChange(newTabIdx)}
        variant='scrollable'
        aria-label='Tabs'
        orientation={orientation}
        className='Tab__Headers'>
        {tabHeaders.map((tabHeader, idx) => (
          <Tab key={idx} label={<div className='Tab__Header'>{tabHeader}</div>}></Tab>
        ))}
      </Tabs>
      <div className='Tab__Body'>{tabContents[tabIdx]}</div>
    </section>
  );
}
