import React from "react";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useEffect, useRef, useState } from "react";
import { getCurrentSessionId, setCurrentSessionId } from "src/frontend/data/session";
import { useGetCurrentSession, useGetSessions, useSelectSession } from "src/frontend/hooks/useSession";
import { useNavigate } from "src/frontend/utils/commonUtils";
import {
  claimSession,
  releaseSession,
  startHeartbeat,
  stopHeartbeat,
  getWindowId,
  onSessionMessage,
} from "src/frontend/data/windowSessionRegistry";
import type { SessionMessage } from "src/frontend/data/windowSessionRegistry";

/** Props for the SessionManager component. */
type SessionManagerProps = {
  /** Child components to render once a valid session is established. */
  children: any;
};

/**
 * Guards the app behind session selection. Shows a session selection modal if no valid session exists,
 * a loading indicator while resolving, or renders children once a session is established.
 * Registers the window in the cross-window session registry and listens for session-deleted
 * and focus-and-close broadcast messages from other windows.
 * @param props - Contains child components to render after session validation.
 * @returns Children, a loading alert, or the session selection modal.
 */
export default function SessionManager(props: SessionManagerProps): React.JSX.Element | null {
  const [status, setStatus] = useState<"pending_session" | "no_session" | "valid_session">("pending_session");
  const { data: currentSession, isLoading: loadingCurrentSession, error: sessionError, refetch } = useGetCurrentSession();
  useSelectSession(true);
  const retryCountRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    // No session ID in sessionStorage — go straight to session select
    if (!getCurrentSessionId()) {
      setStatus("no_session");
      navigate("/session_select", { replace: true });
      return;
    }

    if (loadingCurrentSession) {
      return;
    }

    // Session ID exists but server returned an error (e.g. 404 — session deleted)
    if (sessionError) {
      setStatus("no_session");
      navigate("/session_expired", { replace: true });
      return;
    }

    if (currentSession) {
      setCurrentSessionId(currentSession.id, true);
      setStatus("valid_session");
      retryCountRef.current = 0;

      // Register this window's session ownership and start heartbeat
      claimSession(currentSession.id);
      startHeartbeat();

      return;
    }

    // Session ID exists in sessionStorage but server didn't return it —
    // retry a few times (Electron race condition) before giving up
    if (retryCountRef.current < 10) {
      retryCountRef.current += 1;
      const timer = setTimeout(() => {
        refetch();
      }, 200);
      return () => clearTimeout(timer);
    }

    setStatus("no_session");
    navigate("/session_select", { replace: true });
  }, [currentSession, loadingCurrentSession, sessionError]);

  // Listen for cross-window session messages (session-deleted, focus-and-close)
  useEffect(() => {
    if (status !== "valid_session") {
      return;
    }

    const windowId = getWindowId();
    const sessionId = getCurrentSessionId();

    const unsubscribe = onSessionMessage((message: SessionMessage) => {
      if (message.type === "session-deleted" && message.sessionId === sessionId) {
        // Another window deleted our session — navigate to session_expired
        releaseSession();
        stopHeartbeat();
        navigate("/session_expired", { replace: true });
      }

      if (message.type === "focus-and-close" && message.targetWindowId === windowId) {
        // Another window wants us to take focus (they picked our session)
        window.focus();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [status, navigate]);

  // Clean up registry on unmount
  useEffect(() => {
    return () => {
      releaseSession();
      stopHeartbeat();
    };
  }, []);

  // Refresh session list on focus and check if current session still exists
  const { data: sessions, refetch: refetchSessions } = useGetSessions();

  useEffect(() => {
    if (status !== "valid_session") {
      return;
    }

    const onFocus = () => {
      refetchSessions();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [status, refetchSessions]);

  useEffect(() => {
    if (status !== "valid_session" || !sessions) {
      return;
    }

    const currentId = getCurrentSessionId();
    if (currentId && !sessions.some((s) => s.id === currentId)) {
      navigate("/session_expired", { replace: true });
    }
  }, [status, sessions, navigate]);

  const isLoading = loadingCurrentSession;

  if (status === "no_session") {
    return null;
  }

  if (isLoading || status === "pending_session") {
    return (
      <Alert severity="info" icon={<CircularProgress size={15} />}>
        Loading sqlui-native, please wait...
      </Alert>
    );
  }

  return props.children;
}
