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

export function SessionSelectionForm(props: SessionSelectionFormProps) {
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

export default function SessionSelectionModal() {
  const navigate = useNavigate();
  const { modal, choice, confirm, prompt, alert, dismiss: dismissDialog } = useActionDialogs();
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: openedSessionIds, isLoading: loadingOpenedSessionIds } = useGetOpenedSessionIds();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const isLoading = loadingSessions || loadingOpenedSessionIds || loadingOpenedSessionIds;
  const { mutateAsync: setOpenSession } = useSetOpenSession();
  const { mutateAsync: upsertSession } = useUpsertSession();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    async function _init() {
      try {
        try {
          window.toggleElectronMenu(false, allMenuKeys);
        } catch (err) {}

        window.document.title = 'Choose a Session';

        const options = [
          ...(sessions || []).map((session) => {
            const isSessionOpenedInAnotherWindow =
              openedSessionIds && openedSessionIds?.indexOf(session.id) >= 0;

            return {
              label: session.name,
              value: session.id,
              disabled: isSessionOpenedInAnotherWindow,
              selected: session.id === currentSession?.id || isSessionOpenedInAnotherWindow,
            };
          }),
        ].filter((option) => {
          if (option.disabled) {
            option.label += ` (Already Selected in another Window)`;
          }
          return option;
        }); // here we want to hide

        await modal({
          title: 'Choose a Session',
          message: <SessionSelectionForm options={options} isFirstTime={true} />,
          size: 'sm',
          disableBackdropClick: true,
        });
      } catch (err) {}
    }

    _init();
  }, [currentSession, sessions, openedSessionIds, isLoading]);

  return null;
}
