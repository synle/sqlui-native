import React from 'react';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router-dom';
import { getRandomSessionId } from 'src/frontend/data/session';
import {
  useSelectSession,
  useSetOpenSession,
  useUpsertSession,
} from 'src/frontend/hooks/useSession';
import EditIcon from '@mui/icons-material/Edit';
import MissionControl, { useCommands } from 'src/frontend/components/MissionControl';
export type SessionOption = {
  label: string;
  subtitle?: string;
  value: string;
  selected?: boolean;
  disabled?: boolean;
};

type SessionSelectionFormProps = {
  isFirstTime: boolean;
  options: SessionOption[];
};

export default function SessionSelectionForm(props: SessionSelectionFormProps) {
  const { options, isFirstTime } = props;
  const navigate = useNavigate();
  const { mutateAsync: setOpenSession } = useSetOpenSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { mutateAsync: selectSession } = useSelectSession();
  const { selectCommand } = useCommands();

  const shouldShowRename = !isFirstTime;

  const onCreateNewSession = async (formEl: HTMLElement) => {
    const newSessionName = (formEl.querySelector('input') as HTMLInputElement).value;

    const newSession = await upsertSession({
      id: getRandomSessionId(),
      name: newSessionName,
    });

    selectSession(newSession.id);
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
              selectSession(option.value);
            }
          };
          const labelId = `session-option-${option.value}`;

          let secondaryAction: React.ReactElement | undefined;
          if(!isFirstTime){
            secondaryAction = (
              <IconButton edge="end" aria-label="Edit" onClick={(e) => {
                selectCommand({ event: 'clientEvent/session/rename' })
                e.preventDefault();
                e.stopPropagation();
              }}>
                <EditIcon />
              </IconButton>
            )
          }

          return (
            <ListItem
              button
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
