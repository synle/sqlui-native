import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import ActionDialogs from 'src/frontend/components/ActionDialogs';
import AppHeader from 'src/frontend/components/AppHeader';
import ElectronEventListener from 'src/frontend/components/ElectronEventListener';
import MissionControl, { useCommands } from 'src/frontend/components/MissionControl';
import SessionSelectionModal from 'src/frontend/components/SessionSelectionModal';
import dataApi from 'src/frontend/data/api';
import { setCurrentSessionId } from 'src/frontend/data/session';
import {
  useGetCurrentSession,
  useGetSessions,
  useUpsertSession,
} from 'src/frontend/hooks/useSession';
import { useDarkModeSetting } from 'src/frontend/hooks/useSetting';
import useToaster, { ToasterHandler } from 'src/frontend/hooks/useToaster';
import BookmarksPage from 'src/frontend/views/BookmarksPage';
import EditConnectionPage from 'src/frontend/views/EditConnectionPage';
import MainPage from 'src/frontend/views/MainPage';
import MigrationPage from 'src/frontend/views/MigrationPage';
import NewConnectionPage from 'src/frontend/views/NewConnectionPage';
import { NewRecordPage } from 'src/frontend/views/RecordPage';
import RecycleBinPage from 'src/frontend/views/RecycleBinPage';

type SessionManagerProps = {
  children: any;
};

export default function SessionManager(props: SessionManagerProps) {
  const [status, setStatus] = useState<'pending_session' | 'no_session' | 'valid_session'>(
    'pending_session',
  );
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();

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
