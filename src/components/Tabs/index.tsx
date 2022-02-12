import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import React from 'react';
import { styled } from '@mui/system';

const VERTICAL_TAB_THRESHOLD = 20;

type TabsProps = {
  tabIdx: number;
  onTabChange: (newTabIdx: number) => void;
  tabHeaders: string[] | React.ReactNode[];
  /**
   * This is optional, if none provided, we will use
   * index as tab keys
   */
  tabKeys?: string[];
  tabContents: React.ReactNode[];
  orientation?: 'vertical' | 'horizontal';
  onTabOrdering?: (fromIdx: number, toIdx: number) => void;
};

// these are drag and drop index
let fromIdx: number | undefined, toIdx: number | undefined;

const StyledTabs = styled('section')(({ theme }) => {
  return {
  }
});

export default function MyTabs(props: TabsProps) {
  const { tabIdx, tabHeaders, tabContents } = props;
  let { orientation } = props;

  const visibleTab = tabContents[tabIdx];

  const tabKeys = props.tabKeys || [];

  const onTabChange = (newTabIdx: number) => {
    props.onTabChange && props.onTabChange(newTabIdx);
  };

  const onShowActions = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const actionButton = e.currentTarget.querySelector('.DropdownButton') as HTMLButtonElement;
    actionButton?.click?.();
  };

  const onDragStart = (e: React.DragEvent) => {
    const element = e.currentTarget;

    //@ts-ignore
    fromIdx = [...element.parentNode.children].indexOf(element);
    toIdx = undefined;
  };

  const onDragLeave = (e: React.DragEvent) => {
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.MouseEvent) => {
    const element = e.currentTarget;
    //@ts-ignore
    toIdx = [...element.parentNode.children].indexOf(element);

    if (props.onTabOrdering && fromIdx !== undefined && toIdx !== undefined) {
      props.onTabOrdering(fromIdx, toIdx);
    }
  };

  if (!orientation) {
    orientation = tabHeaders.length > VERTICAL_TAB_THRESHOLD ? 'vertical' : 'horizontal';
  }

  return (
    <StyledTabs
      className={orientation === 'vertical' ? 'Tabs Tabs__Vertical' : 'Tabs Tabs__Horizontal'}>
      <Tabs
        value={tabIdx}
        onChange={(_e, newTabIdx) => onTabChange(newTabIdx)}
        variant='scrollable'
        aria-label='Tabs'
        orientation={orientation}
        className='Tab__Headers'>
        {tabHeaders.map((tabHeader, idx) => {
          let dragAndDropProps: any = {};
          if (props.onTabOrdering) {
            dragAndDropProps = {
              draggable: idx < tabContents.length,
              onDragStart,
              onDragLeave,
              onDragOver,
              onDrop,
            };
          }

          return (
            <Tab
              key={tabKeys[idx] || idx}
              label={<div className='Tab__Header'>{tabHeader}</div>}
              onContextMenu={onShowActions}
              {...dragAndDropProps}></Tab>
          );
        })}
      </Tabs>
      <div className='Tab__Body'>{tabContents[tabIdx]}</div>
    </StyledTabs>
  );
}
