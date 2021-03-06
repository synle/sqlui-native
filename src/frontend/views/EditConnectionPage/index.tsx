import SignalWifiStatusbar4BarIcon from '@mui/icons-material/SignalWifiStatusbar4Bar';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import Breadcrumbs from 'src/frontend/components/Breadcrumbs';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import { EditConnectionForm } from 'src/frontend/components/ConnectionForm';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';

export default function EditConnectionPage() {
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;
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
    <LayoutTwoColumns className='Page Page__EditConnection'>
      <>
        <NewConnectionButton />
        <ConnectionDescription />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: (
                <>
                  <SignalWifiStatusbar4BarIcon fontSize='inherit' />
                  Edit Connection
                </>
              ),
            },
          ]}
        />
        <EditConnectionForm id={connectionId} />
      </>
    </LayoutTwoColumns>
  );
}
