import React, { useState, createRef, useEffect } from 'react';
import NewConnectionButton from 'src/components/NewConnectionButton';
import ConnectionDescription from 'src/components/ConnectionDescription';
import QueryResultTabs from 'src/components/QueryResultTabs';

export default function MainPage() {
  const [width, setWidth] = useState<undefined | number>();

  return (
    <section className='MainPage'>
      <div className='MainPage__LeftPane' style={{ width }}>
        <NewConnectionButton />
        <ConnectionDescription />
      </div>
      <MainPageSpacingResizer onSetWidth={setWidth} />
      <div className='MainPage__RightPane'>
        <QueryResultTabs />
      </div>
    </section>
  );
}

// move this into a file
interface MainPageSpacingResizerProps {
  onSetWidth: (newWidth: number) => void;
}

function MainPageSpacingResizer(props: MainPageSpacingResizerProps) {
  const onDragEnd = (e: React.MouseEvent) => {
    const endX = e.clientX;
    props.onSetWidth(endX);
  };

  return <div className='MainPage__Spacing' draggable={true} onDragEnd={onDragEnd} />;
}
