import React, { useState, createRef, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import { NewConnectionForm } from 'src/components/ConnectionForm';
import NewConnectionButton from 'src/components/NewConnectionButton';
import ConnectionDescription from 'src/components/ConnectionDescription';
import Resizer from 'src/components/Resizer';
import { useParams } from 'react-router-dom';
import { EditConnectionForm } from 'src/components/ConnectionForm';
import { LocalStorageConfig } from 'src/data/config';

export default function EditConnectionPage() {
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;
  const [width, setWidth] = useState<undefined | number>(LocalStorageConfig.get<number>('clientConfig/leftPanelWidth', 300));
  const onSetWidth = (newWidth: number) => {
    LocalStorageConfig.set('clientConfig/leftPanelWidth', newWidth);
    setWidth(newWidth);
  }


  if (!connectionId) {
    return null;
  }

  return (
    <section className='EditConnectionPage LayoutTwoColumns'>
      <div className='LayoutTwoColumns__LeftPane' style={{ width }}>
        <NewConnectionButton />
        <ConnectionDescription />
      </div>
      <Resizer onSetWidth={onSetWidth} />
      <div className='LayoutTwoColumns__RightPane'>
        <Typography variant='h5' gutterBottom={true} sx={{ mt: 1 }}>
          Edit Connection
        </Typography>
        <EditConnectionForm id={connectionId} />
      </div>
    </section>
  );
}
