import React, { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';

export const defaultTableHeight = '40vh';

export const tableCellHeaderHeight = 75;

export const tableCellHeight = 35;

export const tableCellWidth = 160;

export const StyledDivContainer = styled('div')(({ theme }) => ({}));

export const ColumnResizer = styled('div')(({ theme }) => ({
  background: theme.palette.text.primary,
  cursor: 'col-resize',
  userSelect: 'none',
  height: '100%',
  width: '8px',
  position: 'absolute',
  right: '0',
  top: '0',
  opacity: 0.05,
  '&:hover': {
    opacity: 1,
  },
}));

export const StyledDivValueCell = styled('div')(({ theme }) => ({
  flexShrink: 0,
  paddingInline: '0.5rem',
  display: 'flex',
  alignItems: 'center',
  paddingBlock: '7px',
  textOverflow: 'ellipsis',
  wordBreak: 'break-all'
}));


export const StyledDivHeaderRow = styled('div')(({ theme }) => ({
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'nowrap',
  minWidth: '100%',
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  boxSizing: 'border-box',
  fontSize: '1 rem',

  '> div': {
    height: `${tableCellHeaderHeight}px`,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
    paddingTop: '5px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-all',
    whiteSpace: 'nowrap',
  },
}));


export const StyledDivContentRow = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  userSelect: 'none',
  minWidth: '100%',
  backgroundColor: theme.palette.action.selected,
  boxSizing: 'border-box',
  fontSize: '0.95 rem',

  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.focus,
  },

  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

export const StyledDivHeaderCell = styled('div')(({ theme }) => ({
  flexShrink: 0,
  paddingInline: '0.5rem',
}));

export const StyledDivHeaderCellLabel = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  '> span': {
    flexGrow: 1,
  },
}));


// for virtualized ones
export const StyledDivContentRowForVirualized = styled(StyledDivContentRow)(({ theme }) => ({
  position: 'absolute',
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
