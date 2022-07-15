import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
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
import { getRandomSessionId, setCurrentSessionId } from 'src/frontend/data/session';
import {
  useGetCurrentSession,
  useGetSessions,
  useUpsertSession,
  useGetOpenedSessionIds,
  useSetOpenSession,
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
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
type SessionManagerProps = {
  children: any;
}

function SessionSelection(){
  const navigate = useNavigate();
  const { modal, choice, confirm, prompt, alert, dismiss: dismissDialog } = useActionDialogs();
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: openedSessionIds, isLoading: loadingOpenedSessionIds } = useGetOpenedSessionIds();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const isLoading = loadingSessions || loadingOpenedSessionIds || loadingOpenedSessionIds
  const { mutateAsync: setOpenSession } = useSetOpenSession();
  const { mutateAsync: upsertSession } = useUpsertSession();

  useEffect(() => {
    if(isLoading){
      return;
    }

    async function _init(){
      try {
        const options = [
          ...(sessions || []).map((session) => {
            const disabled = openedSessionIds && openedSessionIds?.indexOf(session.id) >= 0;

            if (session.id === currentSession?.id) {
              return {
                label: `${session.name} (Current Session)`,
                value: session.id,
                disabled,
                startIcon: <CheckBoxIcon />,
              };
            }
            return {
              label: session.name,
              value: session.id,
              disabled,
              startIcon: <CheckBoxOutlineBlankIcon />,
            };
          }),
        ];

        const onCreateNewSession = async (formEl: HTMLElement) => {
          // TODO
          const newSessionName = (formEl.querySelector('input') as HTMLInputElement).value;
          console.log('newName', newSessionName)

          const newSession = await upsertSession({
            id: getRandomSessionId(),
            name: newSessionName,
          });

          const newSessionId = newSession.id;

          // set the new session id;
          await setOpenSession(newSessionId);

          // go back to homepage before switching session
          navigate('/', { replace: true });

          // then set it as current session
          await setCurrentSessionId(newSessionId);
        }

        const onSelectSession = async (newSessionId: string) => {
          // TODO
          console.log('switch', newSessionId)

          // set the new session id;
          await setOpenSession(newSessionId);

          // go back to homepage before switching session
          navigate('/', { replace: true });

          // then set it as current session
          await setCurrentSessionId(newSessionId);
        }

        await modal({
          title: 'Change Session',
          message:<div style={{display: 'flex', flexDirection:'column', gap: '1rem'}}>
            <div>Please select a session from below:</div>
              {options.map(option => {
                const onSelectThisSession = () => onSelectSession(option.value)
                return <div key={option.value} style={{display:'flex', gap: '1rem'}}>
                  <span style={{cursor: 'pointer'}} onClick={onSelectThisSession}>{option.startIcon}</span>
                  <span style={{cursor: 'pointer'}} onClick={onSelectThisSession}>{option.label}</span>
                </div>
              })}

            <form onSubmit={(e) => {e.preventDefault(); onCreateNewSession(e.target as HTMLElement)}}
              style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
              <TextField placeholder='Enter name for the new sesssion' label='New Session Name' size='small' required sx={{flexGrow: 1}}/>
              <Button type='submit' size='small'>Create</Button>
            </form>
          </div>,
          size: 'sm',
        });
      } catch (err) {}
    }

    _init();
  }, [currentSession, sessions, openedSessionIds, isLoading])

  return null;
}

export function SessionManager(props: SessionManagerProps){
  const [status, setStatus] = useState<'pending_session' | 'no_session' | 'valid_session'>('pending_session');
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
    return (
      <SessionSelection />
    );
  }

  return props.children;
}

export default function App() {
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
        <MissionControl />
        </SessionManager>
        <ActionDialogs />
      </HashRouter>
      <ElectronEventListener />
    </ThemeProvider>
  );
}
