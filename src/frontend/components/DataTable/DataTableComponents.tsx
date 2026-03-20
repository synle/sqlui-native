import React from "react";
import { styled } from "@mui/material/styles";
import { Bar } from "src/frontend/components/Resizer";

/** Default height for the data table container. */
export const defaultTableHeight = "85vh";

/** Height in pixels for table header cells. */
export const tableCellHeaderHeight = 75;

/** Height in pixels for table data cells. */
export const tableCellHeight = 35;

/** Default width in pixels for table cells. */
export const tableCellWidth = 160;

/**
 * Generic styled div container for the data table.
 * Used as the virtualized row container in ModernDataTable.
 */
export const StyledDivContainer = styled("div")(() => ({}));

const StyledColumnResizer = styled(Bar, {
  shouldForwardProp: (prop) => prop !== "isResizing",
})<{ isResizing?: boolean }>(({ isResizing }) => ({
  position: "absolute",
  right: 0,
  top: 0,
  height: "100%",
  background: isResizing ? "#ccc" : "transparent",
  "&:hover": {
    background: "#ccc",
  },
}));

/** Props for the ColumnResizer component. */
type ColumnResizerProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Whether the column is currently being resized. */
  isResizing?: boolean;
};

/**
 * A draggable column resize handle for data table headers.
 * Prevents event propagation to avoid triggering sort on resize.
 * @param props - Resizer properties including isResizing state and event handlers.
 * @returns A styled resize bar element.
 */
export function ColumnResizer({ isResizing, onMouseDown, onTouchStart, ...rest }: ColumnResizerProps) {
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onMouseDown?.(e);
  };
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onTouchStart?.(e);
  };
  return <StyledColumnResizer size={5} isResizing={isResizing} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} {...rest} />;
}

/** Styled div for table value cells with text ellipsis overflow. */
export const StyledDivValueCell = styled("div")(() => ({
  flexShrink: 0,
  paddingInline: "0.5rem",
  display: "flex",
  alignItems: "center",
  paddingBlock: "7px",
  textOverflow: "ellipsis",
  wordBreak: "break-all",
}));
/** Styled div for the table header row with bold text and theme background. */
export const StyledDivHeaderRow = styled("div")(({ theme }) => ({
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  flexWrap: "nowrap",
  minWidth: "100%",
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  boxSizing: "border-box",
  fontSize: "1 rem",

  "> div": {
    height: `${tableCellHeaderHeight}px`,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    paddingTop: "5px",
    boxSizing: "border-box",
    textOverflow: "ellipsis",
    wordBreak: "break-all",
    whiteSpace: "nowrap",
  },
}));
/** Styled div for table content rows with alternating background colors and hover effect. */
export const StyledDivContentRow = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  userSelect: "none",
  minWidth: "100%",
  backgroundColor: theme.palette.action.selected,
  boxSizing: "border-box",
  fontSize: "0.95 rem",

  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.focus,
  },

  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

/** Styled div for individual table header cells. */
export const StyledDivHeaderCell = styled("div")(() => ({
  flexShrink: 0,
  paddingInline: "0.5rem",
  position: "relative",
}));

/** Styled div for header cell labels with flex layout. */
export const StyledDivHeaderCellLabel = styled("div")(() => ({
  display: "flex",
  alignItems: "center",
  "> span": {
    flexGrow: 1,
  },
}));
/** Styled content row for virtualized table rendering with absolute positioning. */
export const StyledDivContentRowForVirualized = styled(StyledDivContentRow)(() => ({
  position: "absolute",
  top: 0,
  left: 0,
}));

/** Styled header cell for virtualized table rendering with fixed height. */
export const StyledDivHeaderCellForVirtualized = styled(StyledDivHeaderCell)(() => ({
  height: `${tableCellHeight}px`,
}));

/** Styled value cell for virtualized table rendering with fixed height. */
export const StyledDivValueCellForVirtualized = styled(StyledDivValueCell)(() => ({
  height: `${tableCellHeight}px`,
  paddingBottom: 0,
}));
