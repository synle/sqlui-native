import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import MigrationForm from 'src/frontend/components/MigrationForm';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import Resizer from 'src/frontend/components/Resizer';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';

export default function MigrationPage() {
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();

  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

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
