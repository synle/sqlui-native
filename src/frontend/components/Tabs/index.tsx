import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import React from 'react';
import { styled } from '@mui/system';
import { useLayoutModeSetting } from 'src/frontend/hooks/useSetting';

const VERTICAL_TAB_THRESHOLD = 20;

type TabsProps = {
  id?: string;
  /**
   * selected tab index
   * @type {number}
   */
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
  onMiddleMouseClicked?: (idx: number) => void;
  onOrderChange?: (fromIdx: number, toIdx: number) => void;
};

// these are drag and drop index
let fromIdx: number | undefined, toIdx: number | undefined;

const StyledTabs = styled('section')(({ theme }) => {
  return {};
});

export default function MyTabs(props: TabsProps): JSX.Element | null {
  const { id, tabIdx, tabHeaders, tabContents } = props;
  let { orientation } = props;
  const layoutMode = useLayoutModeSetting();
  const isCompact = layoutMode === 'compact';

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

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.MouseEvent) => {
    const element = e.currentTarget;
    //@ts-ignore
    toIdx = [...element.parentNode.children].indexOf(element);

    if (props.onOrderChange && fromIdx !== undefined && toIdx !== undefined) {
      props.onOrderChange(fromIdx, toIdx);
    }
  };

  const onMouseDown = (idx: number) => (e: React.MouseEvent) => {
    if (e.button === 1) {
      // middle mouse click
      e.preventDefault();

      if (props.onMiddleMouseClicked) {
        props.onMiddleMouseClicked(idx);
      }
    }
  };

  if (!orientation) {
    orientation = tabHeaders.length > VERTICAL_TAB_THRESHOLD ? 'vertical' : 'horizontal';
  }

  return (
    <StyledTabs
      id={id}
      className={orientation === 'vertical' ? 'Tabs Tabs__Vertical' : 'Tabs Tabs__Horizontal'}>
      <Tabs
        value={tabIdx}
        onChange={(_e, newTabIdx) => onTabChange(newTabIdx)}
        variant='scrollable'
        aria-label='Tabs'
        orientation={orientation}
        className='Tab__Headers'
        sx={isCompact ? { minHeight: 32 } : undefined}>
        {tabHeaders.map((tabHeader, idx) => {
          let dragAndDropProps: any = {};
          if (props.onOrderChange) {
            dragAndDropProps = {
              draggable: idx < tabContents.length,
              onDragStart,
              onDragOver,
              onDrop,
            };
          }

          return (
            <Tab
              key={tabKeys[idx] || idx}
              label={<div className='Tab__Header'>{tabHeader}</div>}
              onContextMenu={onShowActions}
              onMouseDown={onMouseDown(idx)}
              disableRipple={false}
              sx={isCompact ? { minHeight: 32, py: 0, fontSize: '0.8rem' } : undefined}
              {...dragAndDropProps}></Tab>
          );
        })}
      </Tabs>
      <div className='Tab__Body'>{tabContents[tabIdx]}</div>
    </StyledTabs>
  );
}
