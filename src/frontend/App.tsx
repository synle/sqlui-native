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
import dataApi from 'src/frontend/data/api';
import { getDefaultSessionId, setCurrentSessionId } from 'src/frontend/data/session';
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
import './App.scss';
import 'src/frontend/electronRenderer';

type SessionManagerProps = {
  children: any;
}

export function SessionManager(props: SessionManagerProps){
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();

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

  return props.children;
}

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
    components: {
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true,
        },
      },
    },
  });

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
        <SessionManager>
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
                <Route
                  path='/migration/real_connection'
                  element={<MigrationPage mode='real_connection' />}
                />
                <Route path='/migration/raw_json' element={<MigrationPage mode='raw_json' />} />
                <Route path='/migration' element={<MigrationPage />} />
                <Route path='/recycle_bin' element={<RecycleBinPage />} />
                <Route path='/bookmarks' element={<BookmarksPage />} />
                <Route path='/record/new' element={<NewRecordPage />} />
                <Route path='/*' element={<MainPage />} />
              </Routes>
            </section>
          </Box>
        </SessionManager>
        <MissionControl />
        <ActionDialogs />
      </HashRouter>
      <ElectronEventListener />
    </ThemeProvider>
  );
}
