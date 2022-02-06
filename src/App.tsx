import './App.scss';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { ThemeProvider, useTheme, createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import 'src/electronRenderer';
import EditConnectionPage from 'src/views/EditConnectionPage';
import NewConnectionPage from 'src/views/NewConnectionPage';
import MainPage from 'src/views/MainPage';
import ActionDialogs from 'src/components/ActionDialogs';
import AppHeader from 'src/components/AppHeader';
import ElectronEventListener from 'src/components/ElectronEventListener';
import MissionControl from 'src/components/MissionControl';
import {
  useGetSessions,
  useUpsertSession,
  useDeleteSession,
  useGetCurrentSession,
  useDarkModeSetting,
} from 'src/hooks';
import { getCurrentSessionId, getDefaultSessionId, setCurrentSessionId } from 'src/data/session';

export default function App() {
  const [hasValidSessionId, setHasValidSessionId] = useState(false);
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const colorMode = useDarkModeSetting();

  const myTheme = createTheme({
    // Theme settings
    palette: {
      mode: colorMode,
    },
  });

  useEffect(() => {
    async function _validateSession() {
      if (sessions) {
        if (sessions.length === 0) {
          // if there is no session, let's create the session
          const newSession = await upsertSession({
            id: getDefaultSessionId(),
            name: `Default Session`,
          });

          // then set it as current session
          setCurrentSessionId(newSession.id);

          console.log('>> No Session Found, Getting you a new session', newSession);

          // reload the page just in case
          // TODO: see if we need to use a separate row
          window.location.reload();
        } else {
          // TODO: see if we need to check again the
          // current sessionId
          // assume we don't do delete session
          // this will fine, we don't need to check if the sessionId
          // is present in the list of available sessions
          setHasValidSessionId(true);
        }
      }
    }

    _validateSession();
  }, [sessions]);

  const isLoading = loadingSessions || loadingCurrentSession;

  if (isLoading) {
    return null;
  }

  if (!hasValidSessionId) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  return (
    <ThemeProvider theme={myTheme}>
      <HashRouter>
        <Box
          className='App'
          sx={{
            bgcolor: 'background.default',
            color: 'text.primary',
          }}>
          <AppHeader />
          <section className='App__Section'>
            <Routes>
              <Route path='/' element={<MainPage />} />
              <Route path='/connection/new' element={<NewConnectionPage />} />
              <Route path='/connection/edit/:connectionId' element={<EditConnectionPage />} />
              <Route path='/*' element={<MainPage />} />
            </Routes>
          </section>
        </Box>
        <MissionControl />
      </HashRouter>
      <ActionDialogs />
      <ElectronEventListener />
    </ThemeProvider>
  );
}
