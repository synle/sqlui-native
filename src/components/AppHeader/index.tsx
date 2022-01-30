import { useState, useEffect } from 'react';
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
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import AppsIcon from '@mui/icons-material/Apps';
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
import DropdownButton from 'src/components/DropdownButton';
import { useCommands } from 'src/components/MissionControl';
import { SqluiCore } from 'typings';

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const { choice, prompt } = useActionDialogs();
  const navigate = useNavigate();
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { command, dismissCommand } = useCommands();

  const onChangeSession = async () => {
    if (!sessions) {
      return;
    }

    try {
      const options = [
        ...sessions.map((session) => ({
          label: session.name,
          value: session.id,
          startIcon:
            session.id === currentSession?.id ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />,
        })),
        {
          label: 'New Session',
          value: 'newSession',
          startIcon: <AddIcon />,
        },
      ];

      const selected = await choice('Choose a session', undefined, options);

      // make an api call to update my session to this
      let newSession: SqluiCore.Session | undefined;
      if (selected === 'newSession') {
        // create the new session
        // if there is no session, let's create the session
        const newSessionName = await prompt({
          title: 'New Session',
          message: 'New Session Name',
          value: `Session ${new Date().toLocaleString()}`,
          saveLabel: 'Save',
          required: true,
        });

        if (!newSessionName) {
          return;
        }

        newSession = await upsertSession({
          id: getRandomSessionId(),
          name: newSessionName,
        });
      } else {
        if(currentSession?.id === selected){
          // if they select the same session, just ignore it
          return;
        }
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

  const onRenameSession = async () => {
    try {
      if (!currentSession) {
        return;
      }

      const newSessionName = await prompt({
        title: 'Rename Session',
        message: 'New Session Session',
        value: currentSession.name,
        saveLabel: 'Save',
      });

      if (!newSessionName) {
        return;
      }

      await upsertSession({
        ...currentSession,
        name: newSessionName,
      });
    } catch (err) {
      //@ts-ignore
    }
  };

  useEffect(() => {
    if (command) {
      dismissCommand();

      switch (command.event) {
        case 'clientEvent.changeSession':
          onChangeSession();
          break;
        case 'clientEvent.renameSession':
          onRenameSession();
          break;
      }
    }
  }, [command]);

  const isLoading = loadingSessions || loadingCurrentSession;

  if (isLoading) {
    return null;
  }

  const options = [
    {
      label: 'Change Session',
      onClick: onChangeSession,
    },
    {
      label: 'Rename Session',
      onClick: onRenameSession,
    },
  ];

  return (
    <AppBar position='static'>
      <Toolbar variant='dense'>
        <Typography
          variant='h5'
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer', fontWeight: 'bold', mr: 3 }}>
          SQLUI NATIVE
        </Typography>

        <Tooltip title='This is the current session name. Click to rename it.'>
          <Typography
            variant='subtitle1'
            sx={{ cursor: 'pointer', mr: 'auto', fontFamily: 'monospace' }}
            onClick={onRenameSession}>
            ({currentSession?.name})
          </Typography>
        </Tooltip>

        <DropdownButton
          id='session-action-split-button'
          options={options}
          onToggle={(newOpen) => setOpen(newOpen)}
          isLoading={isLoading}>
          <IconButton aria-label='Table Actions' color='inherit'>
            <MenuIcon fontSize='inherit' color='inherit' />
          </IconButton>
        </DropdownButton>
      </Toolbar>
    </AppBar>
  );
}
