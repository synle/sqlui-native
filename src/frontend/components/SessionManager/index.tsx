import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from 'src/frontend/utils/reactQueryUtils';
import SessionSelectionModal from 'src/frontend/components/SessionSelectionModal';
import { setCurrentSessionId } from 'src/frontend/data/session';
import { useGetCurrentSession, useSelectSession } from 'src/frontend/hooks/useSession';

type SessionManagerProps = {
  children: any;
};

export default function SessionManager(props: SessionManagerProps): JSX.Element | null {
  const [status, setStatus] = useState<'pending_session' | 'no_session' | 'valid_session'>(
    'pending_session',
  );
  const {
    data: currentSession,
    isLoading: loadingCurrentSession,
    refetch,
  } = useGetCurrentSession();
  const { mutateAsync: selectSession } = useSelectSession(true);
  const queryClient = useQueryClient();
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (loadingCurrentSession) {
      return;
    }

    if (currentSession) {
      setCurrentSessionId(currentSession.id, true);
      setStatus('valid_session');
      retryCountRef.current = 0;
      return;
    }

    // If windowId isn't in sessionStorage yet (Electron race condition),
    // retry a few times before concluding there's no session
    const windowId = sessionStorage.getItem('sqlui-native.windowId');
    if (!windowId && retryCountRef.current < 10) {
      retryCountRef.current += 1;
      const timer = setTimeout(() => {
        refetch();
      }, 200);
      return () => clearTimeout(timer);
    }

    setStatus('no_session');
  }, [currentSession, loadingCurrentSession]);

  const isLoading = loadingCurrentSession;

  if (status === 'no_session') {
    return <SessionSelectionModal />;
  }

  if (isLoading || status === 'pending_session') {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading sqlui-native, please wait...
      </Alert>
    );
  }

  return props.children;
}
