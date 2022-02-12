import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import React from 'react';

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

let fromIdx: number | undefined, toIdx: number | undefined;

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

  let dragAndDropProps: any = {};
  if (props.onTabOrdering) {
    const onDragStart = (e: React.DragEvent) => {
      const element = e.currentTarget;

      fromIdx = undefined;
      toIdx = undefined;

      //@ts-ignore
      const newFromIdx = [...element.parentNode.children].indexOf(element);
      if (newFromIdx >= tabContents.length) {
        // not able to drag this, ignore them
        return;
      }

      fromIdx = newFromIdx;

      // @ts-ignore
      e.currentTarget.style.background = 'yellow';
    };

    const onDragLeave = (e: React.DragEvent) => {
      // @ts-ignore
      e.currentTarget.style.background = '';
    };

    const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();

      if (fromIdx !== undefined && toIdx !== undefined) {
        // @ts-ignore
        e.currentTarget.style.background = 'cyan';
      }
    };

    const onDrop = (e: React.MouseEvent) => {
      const element = e.currentTarget;
      //@ts-ignore
      toIdx = [...element.parentNode.children].indexOf(element);

      if (props.onTabOrdering && fromIdx !== undefined && toIdx !== undefined) {
        props.onTabOrdering(fromIdx, toIdx);
      }
    };

    dragAndDropProps = {
      draggable: true,
      onDragStart,
      onDragLeave,
      onDragOver,
      onDrop,
    };
  }

  if (!orientation) {
    orientation = tabHeaders.length > VERTICAL_TAB_THRESHOLD ? 'vertical' : 'horizontal';
  }

  return (
    <section
      className={orientation === 'vertical' ? 'Tabs Tabs__Vertical' : 'Tabs Tabs__Horizontal'}>
      <Tabs
        value={tabIdx}
        onChange={(_e, newTabIdx) => onTabChange(newTabIdx)}
        variant='scrollable'
        aria-label='Tabs'
        orientation={orientation}
        className='Tab__Headers'>
        {tabHeaders.map((tabHeader, idx) => (
          <Tab
            key={tabKeys[idx] || idx}
            label={<div className='Tab__Header'>{tabHeader}</div>}
            onContextMenu={onShowActions}
            {...dragAndDropProps}></Tab>
        ))}
      </Tabs>
      <div className='Tab__Body'>{tabContents[tabIdx]}</div>
    </section>
  );
}
