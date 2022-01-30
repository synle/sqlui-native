import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Tooltip from '@mui/material/Tooltip';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import AddIcon from '@mui/icons-material/Add';
import Avatar from '@mui/material/Avatar';
import EditConnectionPage from 'src/views/EditConnectionPage';
import NewConnectionPage from 'src/views/NewConnectionPage';
import MainPage from 'src/views/MainPage';
import { useActionDialogs } from 'src/components/ActionDialogs';
import {
  useGetSessions,
  useUpsertSession,
  useDeleteSession,
  useGetCurrentSession,
} from 'src/hooks';
import {
  getCurrentSessionId,
  getDefaultSessionId,
  setCurrentSessionId,
  getRandomSessionId,
} from 'src/data/session';
import { SqluiCore } from 'typings';

export default function AppHeader() {
  const { choice, prompt } = useActionDialogs();
  const navigate = useNavigate();
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();

  const onChangeSession = async () => {
    if (!sessions) {
      return;
    }

    try {
      const options = [
        ...sessions.map((session) => ({
          label: session.name,
          value: session.id,
          startIcon: <QueryBuilderIcon />,
        })),
        {
          label: 'New Session',
          value: 'newSession',
          startIcon: <AddIcon />,
        },
      ];

      const selected = await choice(
        'Choose a session',
        <div>
          <Typography variant='subtitle1' gutterBottom={true}>
            <strong>Current Session</strong>
          </Typography>
          <Typography variant='subtitle2' gutterBottom={true}>
            {currentSession?.name || 'N/A'}
          </Typography>
        </div>,
        options,
      );

      // make an api call to update my session to this
      let newSession: SqluiCore.Session | undefined;
      if (selected === 'newSession') {
        // create the new session
        // if there is no session, let's create the session
        const newSessionName = await prompt({
          message: 'New Session Name',
          defaultValue: `Session ${new Date().toLocaleString()}`,
          saveLabel: 'Save',
        });

        if(!newSessionName){
          return;
        }

        newSession = await upsertSession({
          id: getRandomSessionId(),
          name: newSessionName,
        });
      } else {
        newSession = sessions.find((session) => session.id === selected);
      }

      if (!newSession) {
        return;
      }

      // then set it as current session
      setCurrentSessionId(newSession.id);

      // reload the page just in case
      // TODO: see if we need to use a separate row
      window.location.reload();
    } catch (err) {
      //@ts-ignore
    }
  };

  const isLoading = loadingSessions || loadingCurrentSession;

  if (isLoading) {
    return null;
  }

  return (
    <AppBar position='static'>
      <Toolbar variant='dense'>
        <Typography
          variant='h5'
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
          SQLUI NATIVE
        </Typography>

        <Tooltip title='Session Management'>
          <IconButton
            size='large'
            edge='start'
            color='inherit'
            aria-label='menu'
            sx={{ ml: 'auto' }}
            onClick={onChangeSession}>
            <MenuIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
