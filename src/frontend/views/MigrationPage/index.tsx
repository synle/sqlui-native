import Typography from '@mui/material/Typography';
import { useState } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import MigrationForm from 'src/frontend/components/MigrationForm';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import Resizer from 'src/frontend/components/Resizer';
import { LocalStorageConfig } from 'src/frontend/data/config';

export default function MigrationPage() {
  const [width, setWidth] = useState<undefined | number>(
    LocalStorageConfig.get<number>('clientConfig/leftPanelWidth', 300),
  );
  const onSetWidth = (newWidth: number) => {
    LocalStorageConfig.set('clientConfig/leftPanelWidth', newWidth);
    setWidth(newWidth);
  };

  return (
    <section className='MigrationPage LayoutTwoColumns'>
      <div className='LayoutTwoColumns__LeftPane' style={{ width }}>
        <NewConnectionButton />
        <ConnectionDescription />
      </div>
      <Resizer onSetWidth={onSetWidth} />
      <div className='LayoutTwoColumns__RightPane'>
        <Typography variant='h5' gutterBottom={true} sx={{ mt: 1 }}>
          Migration
        </Typography>
        <MigrationForm />
      </div>
    </section>
  );
}
