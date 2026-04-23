import React, { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import { useCommands } from "src/frontend/components/MissionControl";
import { useGetCurrentSession, useGetSessions, useSelectSession, useUpsertSession, useDeleteSession } from "src/frontend/hooks/useSession";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useNavigate } from "src/frontend/utils/commonUtils";
import {
  getSessionOwner,
  broadcastSessionDeleted,
  broadcastFocusAndClose,
  releaseSession,
  stopHeartbeat,
  validateRegistry,
} from "src/frontend/data/windowSessionRegistry";

/** Represents a session option in the session selection list. */
export type SessionOption = {
  /** Display name of the session. */
  label: string;
  /** Additional context (e.g., "Current Session", "In use by another window"). */
  subtitle?: string;
  /** Session ID. */
  value: string;
  /** Whether this session is currently selected. */
  selected?: boolean;
  /** Whether this session is the current window's session. */
  isCurrent?: boolean;
  /** Window ID of the other window that owns this session, or null. */
  ownerWindowId?: string | null;
};

/** Props for the SessionSelectionForm component. */
type SessionSelectionFormProps = {
  /** Whether this is the initial session selection (affects which sessions can be selected). */
  isFirstTime: boolean;
};

/**
 * Form for selecting, creating, renaming, and deleting sessions.
 * Displays available sessions with their status and allows creating new ones.
 * Enforces single-window-per-session: shows "In use by another window" for sessions
 * owned by other windows, and handles focus/close logic when selecting them.
 * @param props - Contains isFirstTime flag to control UI behavior.
 * @returns The session selection form or null while loading.
 */
export default function SessionSelectionForm(props: SessionSelectionFormProps): React.JSX.Element | null {
  const { isFirstTime } = props;
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession, isPending: isCreating } = useUpsertSession();
  const { mutateAsync: selectSession } = useSelectSession();
  const { mutateAsync: deleteSession } = useDeleteSession();
  const { selectCommand } = useCommands();
  const { confirm, alert, dismiss } = useActionDialogs();
  const navigate = useNavigate();

  // Validate registry on mount: ping other windows and remove stale claims from dead windows
  const [registryValidated, setRegistryValidated] = useState(false);
  useEffect(() => {
    validateRegistry().then(() => setRegistryValidated(true));
  }, []);

  const onCreateNewSession = async (formEl: HTMLElement) => {
    const newSessionName = (formEl.querySelector("input") as HTMLInputElement).value;

    const newSession = await upsertSession({
      name: newSessionName,
    } as any);

    selectSession(newSession.id);
  };

  if (loadingSessions || !sessions || !registryValidated) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", padding: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
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
        ownerWindowId: null,
      };
    }

    const ownerWindowId = getSessionOwner(session.id);
    return {
      label,
      subtitle: ownerWindowId ? "In use by another window" : undefined,
      value,
      selected: false,
      isCurrent: false,
      ownerWindowId,
    };
  });

  const onDeleteSessionOption = async (option: SessionOption) => {
    const targetSession = sessions.find((s) => s.id === option.value);
    if (!targetSession) return;

    const hasOtherWindowOwner = !!option.ownerWindowId;
    const windowWarning = hasOtherWindowOwner ? " This will also close any other window currently using this session." : "";

    if (option.isCurrent) {
      try {
        await confirm(`Do you want to delete your current session "${targetSession.name}"?${windowWarning}`);
      } catch (_err) {
        return;
      }
      broadcastSessionDeleted(targetSession.id);
      await deleteSession(targetSession.id);
      releaseSession();
      stopHeartbeat();
      // Dismiss all dialogs (including the parent "Change Session" modal) before closing
      dismiss();
      window.close();
      // Fallback if window.close() didn't work (e.g. browser security)
      navigate("/session_expired", { replace: true });
    } else {
      try {
        await confirm(`Do you want to delete the session "${targetSession.name}"?${windowWarning}`);
      } catch (_err) {
        return;
      }
      broadcastSessionDeleted(targetSession.id);
      await deleteSession(targetSession.id);
    }
  };

  const onSelectThisSession = async (option: SessionOption) => {
    if (option.isCurrent) {
      return; // already on this session
    }

    if (option.ownerWindowId) {
      // Session is in use by another window — focus that window and close this one
      broadcastFocusAndClose(option.ownerWindowId);
      releaseSession();
      stopHeartbeat();

      // Try to close this window. window.close() only works for script-opened windows;
      // in browser/dev mode on manually opened tabs it's a no-op.
      window.close();

      // If still here, show an alert telling the user to switch manually
      try {
        await alert(
          `Session "${option.label}" is already open in another window. Please switch to that window. This window has been disconnected from its session.`,
        );
      } catch (_err) {
        // dismissed
      }
      navigate("/session_select", { replace: true });
      return;
    }

    selectSession(option.value);
  };

  const defaultSessionName = options.length === 0 ? `New Session ${new Date().toLocaleDateString()}` : "";

  return (
    <Box className="FormInput__Container">
      <Box>Please select a session from below:</Box>

      <List>
        {options.map((option) => {
          const labelId = `session-option-${option.value}`;

          let secondaryAction: React.JSX.Element | undefined;
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
            <ListItem dense key={option.value} secondaryAction={secondaryAction} disablePadding>
              <ListItemButton selected={option.selected} onClick={() => onSelectThisSession(option)}>
                <ListItemIcon>
                  <Checkbox edge="start" checked={!!option.selected} tabIndex={-1} slotProps={{ input: { "aria-labelledby": labelId } }} />
                </ListItemIcon>
                <ListItemText id={labelId} primary={option.label} secondary={option.subtitle} />
              </ListItemButton>
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
            disabled={isCreating}
            sx={{ flexGrow: 1 }}
            defaultValue={defaultSessionName}
          />
          <Button type="submit" size="small" disabled={isCreating} startIcon={isCreating ? <CircularProgress size={16} /> : undefined}>
            {isCreating ? "Creating..." : "Create Session"}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
