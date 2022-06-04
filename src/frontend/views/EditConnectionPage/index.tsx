import Typography from '@mui/material/Typography';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import { EditConnectionForm } from 'src/frontend/components/ConnectionForm';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import Resizer from 'src/frontend/components/Resizer';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';

export default function EditConnectionPage() {
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

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
