import Typography from '@mui/material/Typography';
import { useState } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import { NewConnectionForm } from 'src/frontend/components/ConnectionForm';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import Resizer from 'src/frontend/components/Resizer';
import {useSideBarWidthPreference} from 'src/frontend/hooks/useClientSidePreference';
import { LocalStorageConfig } from 'src/frontend/data/config';

export default function NewConnectionPage() {
  const {
    value: width,
    onChange: onSetWidth
  } = useSideBarWidthPreference();

  return (
    <section className='NewConnectionPage LayoutTwoColumns'>
      <div className='LayoutTwoColumns__LeftPane' style={{ width }}>
        <NewConnectionButton />
        <ConnectionDescription />
      </div>
      <Resizer onSetWidth={onSetWidth} />
      <div className='LayoutTwoColumns__RightPane'>
        <Typography variant='h5' gutterBottom={true} sx={{ mt: 1 }}>
          New Connection
        </Typography>
        <NewConnectionForm />
      </div>
    </section>
  );
}
