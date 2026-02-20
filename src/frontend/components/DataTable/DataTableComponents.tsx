import React from "react";
import { styled } from "@mui/material/styles";
import { Bar } from "src/frontend/components/Resizer";

export const defaultTableHeight = "85vh";

export const tableCellHeaderHeight = 75;

export const tableCellHeight = 35;

export const tableCellWidth = 160;

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

type ColumnResizerProps = React.HTMLAttributes<HTMLDivElement> & {
  isResizing?: boolean;
};

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

export const StyledDivValueCell = styled("div")(() => ({
  flexShrink: 0,
  paddingInline: "0.5rem",
  display: "flex",
  alignItems: "center",
  paddingBlock: "7px",
  textOverflow: "ellipsis",
  wordBreak: "break-all",
}));
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

export const StyledDivHeaderCell = styled("div")(() => ({
  flexShrink: 0,
  paddingInline: "0.5rem",
  position: "relative",
}));

export const StyledDivHeaderCellLabel = styled("div")(() => ({
  display: "flex",
  alignItems: "center",
  "> span": {
    flexGrow: 1,
  },
}));
// for virtualized ones
export const StyledDivContentRowForVirualized = styled(StyledDivContentRow)(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
}));

export const StyledDivHeaderCellForVirtualized = styled(StyledDivHeaderCell)(({ theme }) => ({
  height: `${tableCellHeight}px`,
}));

export const StyledDivValueCellForVirtualized = styled(StyledDivValueCell)(({ theme }) => ({
  height: `${tableCellHeight}px`,
  paddingBottom: 0,
}));
