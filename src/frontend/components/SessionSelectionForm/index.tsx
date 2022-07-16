import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ActionDialogs from 'src/frontend/components/ActionDialogs';
import { allMenuKeys } from 'src/frontend/components/MissionControl';
import { getRandomSessionId, setCurrentSessionId } from 'src/frontend/data/session';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import {
  useGetCurrentSession,
  useGetOpenedSessionIds,
  useGetSessions,
  useSetOpenSession,
  useUpsertSession,
} from 'src/frontend/hooks/useSession';

type SessionOption = {
  label: string;
  value: string;
  selected?: boolean;
  disabled?: boolean;
};

type SessionSelectionFormProps = {
  isFirstTime: boolean;
  options: SessionOption[];
};

export default function SessionSelectionForm(props: SessionSelectionFormProps) {
  const { options } = props;
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
  };

  const onSelectSession = async (newSessionId: string) => {
    // set the new session id;
    await setOpenSession(newSessionId);

    // go back to homepage before switching session
    navigate('/', { replace: true });

    // then set it as current session
    await setCurrentSessionId(newSessionId);
  };

  let defaultSessionName =
    options.length === 0 ? `New Session ${new Date().toLocaleDateString()}` : '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box>Please select a session from below:</Box>

      <List>
        {options.map((option) => {
          const onSelectThisSession = () => {
            if (!option.disabled) {
              // don't let them select already selected session
              onSelectSession(option.value);
            }
          };
          const labelId = `session-option-${option.value}`;
          return (
            <ListItem
              button
              key={option.value}
              disabled={option.disabled}
              selected={option.selected}
              onClick={onSelectThisSession}>
              <ListItemIcon>
                <Checkbox
                  edge='start'
                  checked={!!option.selected}
                  tabIndex={-1}
                  inputProps={{ 'aria-labelledby': labelId }}
                />
              </ListItemIcon>
              <ListItemText id={labelId} primary={option.label} />
            </ListItem>
          );
        })}
      </List>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreateNewSession(e.target as HTMLElement);
        }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            placeholder='Enter name for the new session'
            label='New Session Name'
            size='small'
            required
            sx={{ flexGrow: 1 }}
            defaultValue={defaultSessionName}
          />
          <Button type='submit' size='small'>
            Create Session
          </Button>
        </Box>
      </form>
    </Box>
  );
}
