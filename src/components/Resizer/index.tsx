import React from 'react';

// move this into a file
interface ResizerProps {
  onSetWidth: (newWidth: number) => void;
}

export default function Resizer(props: ResizerProps) {
  const onDragEnd = (e: React.MouseEvent) => {
    const endX = e.clientX;
    props.onSetWidth(endX);
  };

  return <div className='Resizer' draggable={true} onDragEnd={onDragEnd} />;
}
