import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import { NewConnectionForm } from 'src/frontend/components/ConnectionForm';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';

import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns'

export default function NewConnectionPage() {
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();

  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className='MainPage'>
      <>
        <NewConnectionButton />
        <ConnectionDescription />
      </>
      <>
        <Typography variant='h5' gutterBottom={true} sx={{ mt: 1 }}>
          New Connection
        </Typography>
        <NewConnectionForm />
      </>
    </LayoutTwoColumns>
  );
}
