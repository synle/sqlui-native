import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect, useState } from 'react';
import SessionSelectionModal from 'src/frontend/components/SessionSelectionModal';
import { setCurrentSessionId } from 'src/frontend/data/session';
import { useGetCurrentSession, useSelectSession } from 'src/frontend/hooks/useSession';

type SessionManagerProps = {
  children: any;
};

export default function SessionManager(props: SessionManagerProps) : JSX.Element | null {
  const [status, setStatus] = useState<'pending_session' | 'no_session' | 'valid_session'>(
    'pending_session',
  );
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: selectSession } = useSelectSession(true);

  useEffect(() => {
    async function _validateSession() {
      if (!currentSession) {
        setStatus('no_session');
      } else {
        setCurrentSessionId(currentSession.id, true);
        setStatus('valid_session');
      }
    }

    _validateSession();
  }, [currentSession]);

  const isLoading = loadingCurrentSession;

  if (isLoading) {
    return null;
  }

  if (status === 'pending_session') {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading sqlui-native, please wait...
      </Alert>
    );
  }

  if (status === 'no_session') {
    return <SessionSelectionModal />;
  }

  return props.children;
}
