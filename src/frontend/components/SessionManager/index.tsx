import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentSessionId, setCurrentSessionId } from "src/frontend/data/session";
import { useGetCurrentSession, useSelectSession } from "src/frontend/hooks/useSession";
import { useNavigate } from "src/frontend/utils/commonUtils";

/** Props for the SessionManager component. */
type SessionManagerProps = {
  /** Child components to render once a valid session is established. */
  children: any;
};

/**
 * Guards the app behind session selection. Shows a session selection modal if no valid session exists,
 * a loading indicator while resolving, or renders children once a session is established.
 * Refetches all data when the window regains focus.
 * @param props - Contains child components to render after session validation.
 * @returns Children, a loading alert, or the session selection modal.
 */
export default function SessionManager(props: SessionManagerProps): JSX.Element | null {
  const [status, setStatus] = useState<"pending_session" | "no_session" | "valid_session">("pending_session");
  const { data: currentSession, isLoading: loadingCurrentSession, error: sessionError, refetch } = useGetCurrentSession();
  useSelectSession(true);
  const retryCountRef = useRef(0);
  const queryClient = useQueryClient();
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

  // Refetch all data when the window regains focus
  useEffect(() => {
    if (status !== "valid_session") {
      return;
    }

    const onFocus = () => {
      queryClient.invalidateQueries();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [status, queryClient]);

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
