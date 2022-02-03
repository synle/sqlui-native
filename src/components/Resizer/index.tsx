import React from 'react';
import Box from '@mui/material/Box';
import { grey } from '@mui/material/colors';

// move this into a file
interface ResizerProps {
  onSetWidth: (newWidth: number) => void;
}

export default function Resizer(props: ResizerProps) {
  const onDragEnd = (e: React.MouseEvent) => {
    const endX = e.clientX;
    props.onSetWidth(endX);
  };

  return (
    <Box
      draggable={true}
      onDragEnd={onDragEnd}
      sx={{
        width: '10px',
        cursor: 'col-resize',
        flexShrink: 0,
        '&:hover': {
          background: grey[400],
        },
      }}
    />
  );
}
