import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import { useCommands } from "src/frontend/components/MissionControl";
import { getRandomSessionId } from "src/frontend/data/session";
import { useGetCurrentSession, useGetSessions, useSelectSession, useUpsertSession, useDeleteSession } from "src/frontend/hooks/useSession";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";

/** Represents a session option in the session selection list. */
export type SessionOption = {
  /** Display name of the session. */
  label: string;
  /** Additional context (e.g., "Current Session"). */
  subtitle?: string;
  /** Session ID. */
  value: string;
  /** Whether this session is currently selected. */
  selected?: boolean;
  /** Whether this session is the current window's session. */
  isCurrent?: boolean;
};

/** Props for the SessionSelectionForm component. */
type SessionSelectionFormProps = {
  /** Whether this is the initial session selection (affects which sessions can be selected). */
  isFirstTime: boolean;
};

/**
 * Form for selecting, creating, renaming, and deleting sessions.
 * Displays available sessions with their status and allows creating new ones.
 * @param props - Contains isFirstTime flag to control UI behavior.
 * @returns The session selection form or null while loading.
 */
export default function SessionSelectionForm(props: SessionSelectionFormProps): JSX.Element | null {
  const { isFirstTime } = props;
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { mutateAsync: selectSession } = useSelectSession();
  const { mutateAsync: deleteSession } = useDeleteSession();
  const { selectCommand } = useCommands();
  const { alert, confirm } = useActionDialogs();

  const onCreateNewSession = async (formEl: HTMLElement) => {
    const newSessionName = (formEl.querySelector("input") as HTMLInputElement).value;

    const newSession = await upsertSession({
      id: getRandomSessionId(),
      name: newSessionName,
    });

    selectSession(newSession.id);
  };

  if (loadingSessions || !sessions) {
    return null;
  }

  const options: SessionOption[] = sessions.map((session) => {
    const isCurrent = session.id === currentSession?.id;

    const label = session.name;
    const value = session.id;

    if (isCurrent) {
      return {
        label,
        subtitle: "Current Session",
        value,
        selected: true,
        isCurrent: true,
      };
    }

    return {
      label,
      value,
      selected: false,
      isCurrent: false,
    };
  });

  const onDeleteSessionOption = async (option: SessionOption) => {
    const targetSession = sessions.find((s) => s.id === option.value);
    if (!targetSession) return;

    if (option.isCurrent) {
      try {
        await confirm(`Do you want to delete your current session "${targetSession.name}"?`);
      } catch (_err) {
        return;
      }
      await deleteSession(targetSession.id);
      await alert("This session has been deleted and can no longer be used. Please close this window and open a new one.");
    } else {
      try {
        await confirm(`Do you want to delete the session "${targetSession.name}"?`);
      } catch (_err) {
        return;
      }
      await deleteSession(targetSession.id);
    }
  };

  const defaultSessionName = options.length === 0 ? `New Session ${new Date().toLocaleDateString()}` : "";

  return (
    <Box className="FormInput__Container">
      <Box>Please select a session from below:</Box>

      <List>
        {options.map((option) => {
          const onSelectThisSession = () => {
            selectSession(option.value);
          };
          const labelId = `session-option-${option.value}`;

          let secondaryAction: JSX.Element | undefined;
          if (!isFirstTime) {
            const targetSession = sessions.find((session) => session.id === option.value);

            secondaryAction = (
              <Box sx={{ display: "flex", gap: 2 }}>
                <IconButton
                  edge="end"
                  color="info"
                  aria-label="Edit"
                  onClick={(e) => {
                    selectCommand({ event: "clientEvent/session/rename", data: targetSession });
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  color="error"
                  aria-label="Delete"
                  onClick={(e) => {
                    onDeleteSessionOption(option);
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            );
          }

          return (
            <ListItem dense key={option.value} selected={option.selected} onClick={onSelectThisSession} secondaryAction={secondaryAction}>
              <ListItemIcon>
                <Checkbox edge="start" checked={!!option.selected} tabIndex={-1} inputProps={{ "aria-labelledby": labelId }} />
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
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            placeholder="Enter name for the new session"
            label="New Session Name"
            size="small"
            required
            sx={{ flexGrow: 1 }}
            defaultValue={defaultSessionName}
          />
          <Button type="submit" size="small">
            Create Session
          </Button>
        </Box>
      </form>
    </Box>
  );
}
