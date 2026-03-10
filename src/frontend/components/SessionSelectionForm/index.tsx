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
import Tooltip from "@mui/material/Tooltip";
import { useCommands } from "src/frontend/components/MissionControl";
import { getRandomSessionId } from "src/frontend/data/session";
import {
  useGetCurrentSession,
  useGetOpenedSessionIds,
  useGetSessions,
  useSelectSession,
  useUpsertSession,
  useDeleteSession,
} from "src/frontend/hooks/useSession";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";

/** Represents a session option in the session selection list. */
export type SessionOption = {
  /** Display name of the session. */
  label: string;
  /** Additional context (e.g., "Current Session" or "Selected in another Window"). */
  subtitle?: string;
  /** Session ID. */
  value: string;
  /** Whether this session is currently selected. */
  selected?: boolean;
  /** Whether this session is unavailable for selection. */
  disabled?: boolean;
  /** Whether this session is the current window's session. */
  isCurrent?: boolean;
  /** Whether this session is opened in another window. */
  isOpenedElsewhere?: boolean;
};

/** Props for the SessionSelectionForm component. */
type SessionSelectionFormProps = {
  /** Whether this is the initial session selection (affects which sessions can be selected). */
  isFirstTime: boolean;
};

/**
 * Form for selecting, creating, renaming, and deleting sessions.
 * Displays available sessions with their status and allows creating new ones.
 *
 * Rules:
 * - Cannot switch to a session already opened in another window.
 * - Cannot delete sessions opened in other windows.
 * - Can delete any unopened session.
 * - Deleting your own session shows a message telling user to close the window.
 * @param props - Contains isFirstTime flag to control UI behavior.
 * @returns The session selection form or null while loading.
 */
export default function SessionSelectionForm(props: SessionSelectionFormProps): JSX.Element | null {
  const { isFirstTime } = props;
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: openedSessionIds, isLoading: loadingOpenedSessionIds } = useGetOpenedSessionIds();
  const { data: currentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { mutateAsync: selectSession } = useSelectSession();
  const { mutateAsync: deleteSession } = useDeleteSession();
  const { selectCommand } = useCommands();
  const { alert, confirm } = useActionDialogs();

  const isLoading = loadingSessions || loadingOpenedSessionIds;

  const onCreateNewSession = async (formEl: HTMLElement) => {
    const newSessionName = (formEl.querySelector("input") as HTMLInputElement).value;

    const newSession = await upsertSession({
      id: getRandomSessionId(),
      name: newSessionName,
    });

    selectSession(newSession.id);
  };

  if (isLoading || !sessions) {
    return null;
  }

  const options: SessionOption[] = sessions.map((session) => {
    const isCurrent = session.id === currentSession?.id;
    const isOpenedElsewhere = !isCurrent && !!openedSessionIds && openedSessionIds.indexOf(session.id) >= 0;

    const label = session.name;
    const value = session.id;

    if (isCurrent) {
      return {
        label,
        subtitle: "Current Session",
        value,
        selected: true,
        isCurrent: true,
        isOpenedElsewhere: false,
      };
    }

    return {
      label,
      subtitle: isOpenedElsewhere ? "Opened in another Window" : undefined,
      value,
      // Cannot switch to sessions opened in other windows
      disabled: isOpenedElsewhere,
      selected: false,
      isCurrent: false,
      isOpenedElsewhere,
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
            if (!option.disabled) {
              selectSession(option.value);
            }
          };
          const labelId = `session-option-${option.value}`;

          // Determine which actions are available
          const canEdit = !option.isOpenedElsewhere;
          // Can delete: own session or any unopened session. Cannot delete sessions opened in other windows.
          const canDelete = !option.isOpenedElsewhere;

          let secondaryAction: JSX.Element | undefined;
          if (!isFirstTime) {
            const targetSession = sessions.find((session) => session.id === option.value);

            secondaryAction = (
              <Box sx={{ display: "flex", gap: 2 }}>
                {canEdit && (
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
                )}
                {canDelete ? (
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
                ) : (
                  <Tooltip title="Cannot delete a session opened in another window">
                    <span>
                      <IconButton edge="end" color="error" aria-label="Delete" disabled>
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
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
              secondaryAction={secondaryAction}
            >
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
