import React, { useState, createRef, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import { NewConnectionForm } from 'src/components/ConnectionForm';
import NewConnectionButton from 'src/components/NewConnectionButton';
import ConnectionDescription from 'src/components/ConnectionDescription';
import QueryResultTabs from 'src/components/QueryResultTabs';
import Resizer from 'src/components/Resizer';

export default function NewConnectionPage() {
  const [width, setWidth] = useState<undefined | number>();

  return (
    <section className='NewConnectionPage LayoutTwoColumns'>
      <div className='LayoutTwoColumns__LeftPane' style={{ width }}>
        <NewConnectionButton />
        <ConnectionDescription />
      </div>
      <Resizer onSetWidth={setWidth} />
      <div className='LayoutTwoColumns__RightPane'>
        <div>
          <Typography variant='h5' gutterBottom={true}>
            New Connection
          </Typography>
        </div>
        <NewConnectionForm />
      </div>
    </section>
  );
}
