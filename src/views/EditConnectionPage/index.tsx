import React, { useState, createRef, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import { NewConnectionForm } from 'src/components/ConnectionForm';
import NewConnectionButton from 'src/components/NewConnectionButton';
import ConnectionDescription from 'src/components/ConnectionDescription';
import QueryResultTabs from 'src/components/QueryResultTabs';
import Resizer from 'src/components/Resizer';
import { useParams } from 'react-router-dom';
import { EditConnectionForm } from 'src/components/ConnectionForm';

export default function EditConnectionPage() {
  const [width, setWidth] = useState<undefined | number>();
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;

  if (!connectionId) {
    return null;
  }

  return (
    <section className='EditConnectionPage LayoutTwoColumns'>
      <div className='LayoutTwoColumns__LeftPane' style={{ width }}>
        <NewConnectionButton />
        <ConnectionDescription />
      </div>
      <Resizer onSetWidth={setWidth} />
      <div className='LayoutTwoColumns__RightPane'>
        <div>
          <Typography variant='h5' gutterBottom={true}>
            Edit Connection
          </Typography>
        </div>
        <EditConnectionForm id={connectionId} />
      </div>
    </section>
  );
}
