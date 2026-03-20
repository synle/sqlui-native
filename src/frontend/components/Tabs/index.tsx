import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import React from "react";
import { styled } from "@mui/system";

import { useLayoutModeSetting } from "src/frontend/hooks/useSetting";

/** Tab count threshold above which vertical orientation is used by default. */
const VERTICAL_TAB_THRESHOLD = 20;
/** Default tab height in pixels. */
const TAB_HEIGHT_DEFAULT = 40;
/** Compact mode tab height in pixels. */
const TAB_HEIGHT_COMPACT = 32;

/** Props for the MyTabs component. */
type TabsProps = {
  /** Optional HTML id for the tabs container. */
  id?: string;
  /**
   * selected tab index
   * @type {number}
   */
  tabIdx: number;
  /** Callback fired when the selected tab changes. */
  onTabChange: (newTabIdx: number) => void;
  /** Array of tab header labels or React nodes. */
  tabHeaders: string[] | React.ReactNode[];
  /**
   * Optional stable keys for each tab. If not provided, the index is used.
   */
  tabKeys?: string[];
  /** Content rendered for each tab at the matching index. */
  tabContents: React.ReactNode[];
  /** Tab layout direction; auto-selected based on count if omitted. */
  orientation?: "vertical" | "horizontal";
  /** Called when a tab is closed via middle-mouse click. */
  onMiddleMouseClicked?: (idx: number) => void;
  /** Called when a tab is drag-and-drop reordered. */
  onOrderChange?: (fromIdx: number, toIdx: number) => void;
};

// these are drag and drop index
let fromIdx: number | undefined, toIdx: number | undefined;

const StyledTabs = styled("section")(() => {
  return {};
});

/**
 * Reusable tabbed interface supporting horizontal/vertical orientation, drag-and-drop reordering,
 * middle-click to close, and context menu actions.
 * @param props - Tab configuration including headers, contents, orientation, and event handlers.
 * @returns The tabbed UI.
 */
export default function MyTabs(props: TabsProps): JSX.Element | null {
  const { id, tabIdx, tabHeaders, tabContents } = props;
  let { orientation } = props;
  const layoutMode = useLayoutModeSetting();
  const isCompact = layoutMode === "compact";
  const tabHeight = isCompact ? TAB_HEIGHT_COMPACT : TAB_HEIGHT_DEFAULT;

  const tabKeys = props.tabKeys || [];

  const onTabChange = (newTabIdx: number) => {
    props.onTabChange && props.onTabChange(newTabIdx);
  };

  const onShowActions = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const actionButton = e.currentTarget.querySelector(".DropdownButton") as HTMLButtonElement;
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
    orientation = tabHeaders.length > VERTICAL_TAB_THRESHOLD ? "vertical" : "horizontal";
  }

  return (
    <StyledTabs id={id} className={orientation === "vertical" ? "Tabs Tabs__Vertical" : "Tabs Tabs__Horizontal"}>
      <Tabs
        value={tabIdx}
        onChange={(_e, newTabIdx) => onTabChange(newTabIdx)}
        variant="scrollable"
        aria-label="Tabs"
        orientation={orientation}
        className="Tab__Headers"
        sx={{ minHeight: tabHeight }}
      >
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
              label={<div className="Tab__Header">{tabHeader}</div>}
              onContextMenu={onShowActions}
              onMouseDown={onMouseDown(idx)}
              disableRipple={false}
              sx={
                isCompact
                  ? { minHeight: TAB_HEIGHT_COMPACT, py: 0, fontSize: "0.8rem" }
                  : { minHeight: TAB_HEIGHT_DEFAULT, fontSize: "0.9rem" }
              }
              {...dragAndDropProps}
            ></Tab>
          );
        })}
      </Tabs>
      <div className="Tab__Body">{tabContents[tabIdx]}</div>
    </StyledTabs>
  );
}
