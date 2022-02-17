import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import ActionDialogs from 'src/components/ActionDialogs';
import AppHeader from 'src/components/AppHeader';
import ElectronEventListener from 'src/components/ElectronEventListener';
import MissionControl, { useCommands } from 'src/components/MissionControl';
import Toasters from 'src/components/Toasters';
import dataApi from 'src/data/api';
import { getDefaultSessionId, setCurrentSessionId } from 'src/data/session';
import { useGetCurrentSession, useGetSessions, useUpsertSession } from 'src/hooks/useSession';
import { useDarkModeSetting } from 'src/hooks/useSetting';
import useToaster, { ToasterHandler } from 'src/hooks/useToaster';
import EditConnectionPage from 'src/views/EditConnectionPage';
import MainPage from 'src/views/MainPage';
import NewConnectionPage from 'src/views/NewConnectionPage';
import './App.scss';
import 'src/electronRenderer';

export default function App() {
  const [hasValidSessionId, setHasValidSessionId] = useState(false);
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const colorMode = useDarkModeSetting();
  const { selectCommand } = useCommands();
  const { add: addToast } = useToaster();
  const toasterRef = useRef<ToasterHandler | undefined>();

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
        Loading sqlui-native, please wait...
      </Alert>
    );
  }

  const onDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.items && e.dataTransfer.items.length === 1) {
      e.preventDefault();

      await toasterRef.current?.dismiss();

      toasterRef.current = await addToast({
        message: `Parsing the file for importing, please wait...`,
      });

      // TODO: right now only support one file for drop...
      const files = [...e.dataTransfer.items]
        .map((item) => item.getAsFile())
        .filter((f) => f) as File[];

      //@ts-ignore
      const file = files[0];
      if (file.type === 'application/json') {
        selectCommand({ event: 'clientEvent/import', data: await dataApi.readFileContent(file) });
      } else {
        await addToast({
          message: `File not supported for import. Only application/json file type is supported.`,
        });
      }

      await toasterRef.current?.dismiss();
      toasterRef.current = undefined;
    }
  };

  const onDragOver = async (e: React.DragEvent) => {
    if (e.dataTransfer.items && e.dataTransfer.items.length === 1) {
      e.preventDefault();

      if (!toasterRef.current) {
        toasterRef.current = await addToast({
          message: `Drop the file here to upload and import it.`,
        });
      }
    }
  };

  return (
    <ThemeProvider theme={myTheme}>
      <HashRouter>
        <Box
          className='App'
          sx={{
            bgcolor: 'background.default',
            color: 'text.primary',
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}>
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
      <Toasters />
      <ElectronEventListener />
    </ThemeProvider>
  );
}
