import React from 'react';
import { styled, createTheme, ThemeProvider } from '@mui/system';

const StyledAccordionHeader = styled('div')(({ theme }) => {
  const backgroundColor = theme.palette.action.focus;

  return {
    width: '10px',
    cursor: 'col-resize',
    flexShrink: 0,
    '&:hover': {
      background: theme.palette.action.focus,
    },
  };
});

// move this into a file
interface ResizerProps {
  onSetWidth: (newWidth: number) => void;
}

export default function Resizer(props: ResizerProps) {
  const onDragEnd = (e: React.MouseEvent) => {
    const endX = e.clientX;
    props.onSetWidth(endX);
  };

  return <StyledAccordionHeader draggable={true} onDragEnd={onDragEnd} />;
}
