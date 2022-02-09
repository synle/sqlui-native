import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { LocalStorageConfig } from 'src/data/config';
import { NewConnectionForm } from 'src/components/ConnectionForm';
import ConnectionDescription from 'src/components/ConnectionDescription';
import NewConnectionButton from 'src/components/NewConnectionButton';
import Resizer from 'src/components/Resizer';
export default function NewConnectionPage() {
  const [width, setWidth] = useState<undefined | number>(
    LocalStorageConfig.get<number>('clientConfig/leftPanelWidth', 300),
  );
  const onSetWidth = (newWidth: number) => {
    LocalStorageConfig.set('clientConfig/leftPanelWidth', newWidth);
    setWidth(newWidth);
  };

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
