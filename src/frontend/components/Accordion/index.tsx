import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import React from "react";
import { styled } from "@mui/system";
import { useLayoutModeSetting } from "src/frontend/hooks/useSetting";

const ACCORDION_HEIGHT_DEFAULT = 37;
const ACCORDION_HEIGHT_COMPACT = 28;
const ACCORDION_FONT_SIZE_DEFAULT = "0.9rem";
const ACCORDION_FONT_SIZE_COMPACT = "0.8rem";
const ACCORDION_GAP_DEFAULT = "5px";
const ACCORDION_GAP_COMPACT = "3px";
// these are drag and drop index
let fromIdx: number | undefined, toIdx: number | undefined;

function _getIndex(currentTarget: Element) {
  const connectionElems = document.querySelectorAll(".Accordion__Header.ConnectionDescription");
  for (let i = 0; i < connectionElems.length; i++) {
    const connectionElem = connectionElems[i];
    if (connectionElem === currentTarget) {
      return i;
    }
  }
}

const StyledAccordionHeader = styled("div", {
  shouldForwardProp: (prop) => prop !== "compact",
})<{ compact?: boolean }>(({ theme, compact }) => {
  return {
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    minHeight: compact ? ACCORDION_HEIGHT_COMPACT : ACCORDION_HEIGHT_DEFAULT,
    gap: compact ? ACCORDION_GAP_COMPACT : ACCORDION_GAP_DEFAULT,
    fontSize: compact ? ACCORDION_FONT_SIZE_COMPACT : ACCORDION_FONT_SIZE_DEFAULT,

    "&:hover, &:focus-within, &:focus": {
      backgroundColor: theme.palette.action.hover,
    },

    "&.selected": {
      backgroundColor: theme.palette.action.selected,
    },

    "> span": {
      flexGrow: "1",
      fontWeight: "bold",
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
  };
});

type AccordionBodyProps = {
  children: React.ReactNode[] | React.ReactNode;
  expanded: boolean;
};

type AccordionHeaderProps = AccordionBodyProps & {
  onToggle: () => void;
  className?: string;
  onOrderChange?: (fromIdx: number, toIdx: number) => void;
  connectionIndex?: number;
};

export function AccordionHeader(props: AccordionHeaderProps): JSX.Element | null {
  const { children, expanded, onToggle, className } = props;
  const isCompact = useLayoutModeSetting() === "compact";

  const onShowActions = (e: React.SyntheticEvent) => {
    e.preventDefault();

    const actionButton = e.currentTarget.querySelector(".DropdownButton") as HTMLButtonElement;
    actionButton?.click?.();
  };

  const onDragStart = (e: React.DragEvent) => {
    if (props.connectionIndex !== undefined) {
      fromIdx = props.connectionIndex;
      e.dataTransfer.setData("text/plain", String(props.connectionIndex));
    } else {
      fromIdx = _getIndex(e.currentTarget);
    }
    toIdx = undefined;
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.MouseEvent) => {
    if (props.connectionIndex !== undefined) {
      toIdx = props.connectionIndex;
    } else {
      toIdx = _getIndex(e.currentTarget);
    }

    if (fromIdx !== undefined && toIdx !== undefined && props.onOrderChange !== undefined) {
      props.onOrderChange(fromIdx, toIdx);
    }
  };

  const dragAndDropProps = props.onOrderChange
    ? {
        draggable: true,
        onDragStart: onDragStart,
        onDragOver: onDragOver,
        onDrop: onDrop,
      }
    : undefined;

  return (
    <StyledAccordionHeader
      {...dragAndDropProps}
      compact={isCompact}
      onClick={() => onToggle()}
      className={"Accordion__Header " + className}
      onContextMenu={onShowActions}
    >
      {!expanded ? <ExpandLessIcon fontSize="inherit" color="inherit" /> : <ExpandMoreIcon fontSize="inherit" color="inherit" />}
      {children}
    </StyledAccordionHeader>
  );
}

const StyledAccordionBody = styled("div")<{ expanded: boolean }>(({ expanded }) => ({
  display: "grid",
  gridTemplateRows: expanded ? "1fr" : "0fr",
  transition: "grid-template-rows 0.2s ease-out",
  "& > .Accordion__Body__Inner": {
    overflow: "hidden",
  },
}));

export function AccordionBody(props: AccordionBodyProps): JSX.Element | null {
  const { children, expanded } = props;
  return (
    <StyledAccordionBody expanded={expanded}>
      <div className="Accordion__Body__Inner">{children}</div>
    </StyledAccordionBody>
  );
}
