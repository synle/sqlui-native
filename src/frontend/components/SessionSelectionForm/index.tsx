import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { useCommands } from 'src/frontend/components/MissionControl';
import { getRandomSessionId } from 'src/frontend/data/session';
import {
  useGetCurrentSession,
  useGetOpenedSessionIds,
  useGetSessions,
  useSelectSession,
  useSetOpenSession,
  useUpsertSession,
} from 'src/frontend/hooks/useSession';

export type SessionOption = {
  label: string;
  subtitle?: string;
  value: string;
  selected?: boolean;
  disabled?: boolean;
};

type SessionSelectionFormProps = {
  isFirstTime: boolean;
};

export default function SessionSelectionForm(props: SessionSelectionFormProps) {
  const { isFirstTime } = props;
  const navigate = useNavigate();
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: openedSessionIds, isLoading: loadingOpenedSessionIds } = useGetOpenedSessionIds();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: setOpenSession } = useSetOpenSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { mutateAsync: selectSession } = useSelectSession();
  const { selectCommand } = useCommands();

  const isLoading = loadingSessions || loadingOpenedSessionIds || loadingOpenedSessionIds;

  const shouldShowRename = !isFirstTime;

  const onCreateNewSession = async (formEl: HTMLElement) => {
    const newSessionName = (formEl.querySelector('input') as HTMLInputElement).value;

    const newSession = await upsertSession({
      id: getRandomSessionId(),
      name: newSessionName,
    });

    selectSession(newSession.id);
  };

  if (isLoading || !sessions) {
    return null;
  }

  const options: SessionOption[] = [
    ...sessions.map((session) => {
      const isSessionOpenedInAnotherWindow =
        openedSessionIds && openedSessionIds?.indexOf(session.id) >= 0;

      const label = session.name;
      const value = session.id;

      if (session.id === currentSession?.id) {
        return {
          label,
          subtitle: `Current Session`,
          value,
          selected: true,
        };
      }

      return {
        label,
        subtitle: isSessionOpenedInAnotherWindow ? `Selected in another Window` : undefined,
        value,
        disabled: isSessionOpenedInAnotherWindow,
        selected: isSessionOpenedInAnotherWindow,
      };
    }),
  ];

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
              selectSession(option.value);
            }
          };
          const labelId = `session-option-${option.value}`;

          let secondaryAction: React.ReactElement | undefined;
          if (!isFirstTime) {
            const targetSession = sessions.find((session) => session.id === option.value);

            secondaryAction = (
              <Box sx={{display: 'flex', gap: 2}}>
                <IconButton
                  edge='end'
                  color='info'
                  aria-label='Edit'
                  onClick={(e) => {
                    selectCommand({ event: 'clientEvent/session/rename', data: targetSession });
                    e.preventDefault();
                    e.stopPropagation();
                  }}>
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge='end'
                  color='error'
                  aria-label='Delete'
                  onClick={(e) => {
                    selectCommand({ event: 'clientEvent/session/delete', data: targetSession });
                    e.preventDefault();
                    e.stopPropagation();
                  }}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            );
          }

          return (
            <ListItem
              dense
              key={option.value}
              disabled={option.disabled}
              selected={option.selected}
              onClick={onSelectThisSession}
              secondaryAction={secondaryAction}>
              <ListItemIcon>
                <Checkbox
                  edge='start'
                  checked={!!option.selected}
                  tabIndex={-1}
                  inputProps={{ 'aria-labelledby': labelId }}
                />
              </ListItemIcon>
              <ListItemText id={labelId} primary={option.label} secondary={option.subtitle} />
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
