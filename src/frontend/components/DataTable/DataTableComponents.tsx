import React from "react";
import { styled } from "@mui/material/styles";
import { Bar } from "src/frontend/components/Resizer";

/** Default height for the data table container. */
export const defaultTableHeight = "85vh";

/** Height in pixels of the single-line label at the top of a header cell in comfortable mode. */
export const tableHeaderLabelHeight = 26;

/** Height in pixels of the single-line label at the top of a header cell in compact mode. */
export const tableHeaderLabelHeightCompact = 22;

/**
 * Height in pixels reserved for the `size="small"` filter input rendered under each header label.
 * Header cells are absolutely positioned so they contribute nothing to their row's height — the
 * space the filter needs has to be reserved up front or the input bleeds onto the first data row.
 */
export const tableHeaderFilterHeight = 40;

/** Vertical gap in pixels between a header label and its filter input in comfortable mode. */
export const tableHeaderFilterGap = 8;

/** Vertical gap in pixels between a header label and its filter input in compact mode. */
export const tableHeaderFilterGapCompact = 4;

/** Vertical padding in pixels above and below header cell content in comfortable mode. */
export const tableHeaderPaddingBlock = 6;

/** Vertical padding in pixels above and below header cell content in compact mode. */
export const tableHeaderPaddingBlockCompact = 4;

/** Height in pixels for table header cells in comfortable mode, derived from the parts stacked inside them. */
export const tableCellHeaderHeight = tableHeaderPaddingBlock * 2 + tableHeaderLabelHeight + tableHeaderFilterGap + tableHeaderFilterHeight;

/** Height in pixels for table header cells in compact mode, derived from the parts stacked inside them. */
export const tableCellHeaderHeightCompact =
  tableHeaderPaddingBlockCompact * 2 + tableHeaderLabelHeightCompact + tableHeaderFilterGapCompact + tableHeaderFilterHeight;

/** Height in pixels for table data cells in comfortable mode. */
export const tableCellHeight = 35;

/** Height in pixels for table data cells in compact mode. */
export const tableCellHeightCompact = 28;

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
  ".DataTable--compact &": {
    paddingInline: "0.35rem",
    paddingBlock: "3px",
  },
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
    paddingTop: `${tableHeaderPaddingBlock}px`,
    paddingBottom: `${tableHeaderPaddingBlock}px`,
    boxSizing: "border-box",
    // Header cells are absolutely positioned, so anything taller than the cell would paint over the
    // first data row instead of pushing it down.
    overflow: "hidden",
    textOverflow: "ellipsis",
    wordBreak: "break-all",
    whiteSpace: "nowrap",
  },

  ".DataTable--compact &": {
    "> div": {
      height: `${tableCellHeaderHeightCompact}px`,
      paddingTop: `${tableHeaderPaddingBlockCompact}px`,
      paddingBottom: `${tableHeaderPaddingBlockCompact}px`,
    },
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
  ".DataTable--compact &": {
    paddingInline: "0.35rem",
  },
}));

/** Styled div for header cell labels with flex layout. */
export const StyledDivHeaderCellLabel = styled("div")(() => ({
  display: "flex",
  alignItems: "center",
  height: `${tableHeaderLabelHeight}px`,
  boxSizing: "border-box",
  ".DataTable--compact &": {
    height: `${tableHeaderLabelHeightCompact}px`,
  },
  "> span": {
    flexGrow: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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
  height: `${tableCellHeaderHeight}px`,
  ".DataTable--compact &": {
    height: `${tableCellHeaderHeightCompact}px`,
  },
}));

/** Styled value cell for virtualized table rendering with fixed height. */
export const StyledDivValueCellForVirtualized = styled(StyledDivValueCell)(() => ({
  height: `${tableCellHeight}px`,
  paddingBottom: 0,
  ".DataTable--compact &": {
    height: `${tableCellHeightCompact}px`,
  },
}));
