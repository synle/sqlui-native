import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SessionSelectionModal from "src/frontend/components/SessionSelectionModal";
import { setCurrentSessionId } from "src/frontend/data/session";
import { useGetCurrentSession, useSelectSession } from "src/frontend/hooks/useSession";

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
  const { data: currentSession, isLoading: loadingCurrentSession, refetch } = useGetCurrentSession();
  useSelectSession(true);
  const retryCountRef = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (loadingCurrentSession) {
      return;
    }

    if (currentSession) {
      setCurrentSessionId(currentSession.id, true);
      setStatus("valid_session");
      retryCountRef.current = 0;
      return;
    }

    // If windowId isn't in sessionStorage yet (Electron race condition),
    // retry a few times before concluding there's no session
    const windowId = sessionStorage.getItem("sqlui-native.windowId");
    if (!windowId && retryCountRef.current < 10) {
      retryCountRef.current += 1;
      const timer = setTimeout(() => {
        refetch();
      }, 200);
      return () => clearTimeout(timer);
    }

    setStatus("no_session");
  }, [currentSession, loadingCurrentSession]);

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
    return <SessionSelectionModal />;
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
