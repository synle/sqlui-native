import React from 'react';
import { styled } from '@mui/system';

const StyledResizer = styled('div')(({ theme }) => {
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
type ResizerProps = {
  onSetWidth: (deltaWidth: number) => void;
};

const DRAG_GHOST_ID = 'drag-ghost';

export default function Resizer(props: ResizerProps) {
  let startX: number | undefined, startY: number | undefined;
  const onDragStart = (e: React.DragEvent) => {
    const dragGhostElem = document.createElement('div');
    dragGhostElem.id = DRAG_GHOST_ID;
    document.body.appendChild(dragGhostElem);
    startX = e.clientX;
  };

  const onDragEnd = (e: React.MouseEvent) => {
    if(startX === undefined){
      return;
    }
    props.onSetWidth(e.clientX - startX);
    document.querySelector(`#${DRAG_GHOST_ID}`)?.remove();
  };

  const onDrag = (e: React.MouseEvent) => {
    // const dragGhostElem = document.querySelector(`#${DRAG_GHOST_ID}`);
    // const endX = e.clientX;
    // //@ts-ignore
    // dragGhostElem.style.width = e.clientX + 'px';
  };

  return (
    <StyledResizer
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrag={onDrag}
    />
  );
}
