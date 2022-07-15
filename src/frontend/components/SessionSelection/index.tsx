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
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

type SessionSelectionProps = {
  options: any[];
}

export default function SessionSelection(props: SessionSelectionProps){
  const {options} = props;
  const navigate = useNavigate();
  const { mutateAsync: setOpenSession } = useSetOpenSession();
  const { mutateAsync: upsertSession } = useUpsertSession();

  const onCreateNewSession = async (formEl: HTMLElement) => {
    const newSessionName = (formEl.querySelector('input') as HTMLInputElement).value;

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
    // set the new session id;
    await setOpenSession(newSessionId);

    // go back to homepage before switching session
    navigate('/', { replace: true });

    // then set it as current session
    await setCurrentSessionId(newSessionId);
  }

  return <div style={{display: 'flex', flexDirection:'column', gap: '1rem'}}>
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
      <TextField placeholder='Enter name for the new session' label='New Session Name' size='small' required sx={{flexGrow: 1}}/>
      <Button type='submit' size='small'>Create</Button>
    </form>
  </div>
}
