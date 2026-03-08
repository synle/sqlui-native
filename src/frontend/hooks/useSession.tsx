import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "src/frontend/utils/commonUtils";
import dataApi from "src/frontend/data/api";
import { setCurrentSessionId } from "src/frontend/data/session";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useAddRecycleBinItem } from "src/frontend/hooks/useFolderItems";
import { useIsSoftDeleteModeSetting } from "src/frontend/hooks/useSetting";
import { SqluiCore } from "typings";

/** React Query cache key for sessions. */
const QUERY_KEY_SESSIONS = "sessions";

/**
 * Hook to fetch all sessions.
 * @returns React Query result containing an array of sessions.
 */
export function useGetSessions() {
  return useQuery([QUERY_KEY_SESSIONS], dataApi.getSessions, {
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to fetch IDs of currently opened sessions across windows.
 * @returns React Query result containing opened session IDs.
 */
export function useGetOpenedSessionIds() {
  return useQuery([QUERY_KEY_SESSIONS, "opened"], dataApi.getOpenedSessionIds, {
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to mark a session as open. Invalidates the sessions cache on success.
 * @returns Mutation that accepts a session ID to open.
 */
export function useSetOpenSession() {
  const queryClient = useQueryClient();
  return useMutation<Record<string, string>, void, string>(dataApi.setOpenSession, {
    onSuccess: async () => {
      queryClient.invalidateQueries([QUERY_KEY_SESSIONS]);
    },
  });
}

/**
 * Hook to fetch the current active session for this window.
 * @returns React Query result containing the current session.
 */
export function useGetCurrentSession() {
  return useQuery([QUERY_KEY_SESSIONS, "current"], dataApi.getSession, {
    notifyOnChangeProps: ["data", "error", "status"],
  });
}

/**
 * Hook to switch to a different session. Creates a new window session or focuses an existing one.
 * @param suppressReload - If true, suppresses page reload after switching sessions.
 * @returns Mutation that accepts a session ID to select.
 */
export function useSelectSession(suppressReload?: boolean) {
  const { mutateAsync: setOpenSession } = useSetOpenSession();
  const navigate = useNavigate();
  const { alert, dismiss: dismissDialog } = useActionDialogs();
  return useMutation<void, void, string>(async (newSessionId: string) => {
    // set the new session id;
    const { outcome } = await setOpenSession(newSessionId);

    if (outcome === "create_new_session") {
      // if this is a brand new session that we can focus on
      // go back to homepage before switching session
      navigate("/", { replace: true });

      // then set it as current session
      await setCurrentSessionId(newSessionId, suppressReload);
    } else {
      // let's close this modal and show an alert
      await dismissDialog();
      await alert(`The window with this sessionId is now focused.`);
    }
  });
}

/**
 * Hook to create or update a session.
 * @returns Mutation that accepts session properties and returns the upserted session.
 */
export function useUpsertSession() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.Session, void, SqluiCore.CoreSession>(dataApi.upsertSession, {
    onSuccess: async (newSession) => {
      queryClient.invalidateQueries([QUERY_KEY_SESSIONS]);
      return newSession;
    },
  });
}

/**
 * Hook to clone an existing session.
 * @returns Mutation that accepts session properties and returns the cloned session.
 */
export function useCloneSession() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.Session, void, SqluiCore.CoreSession>(dataApi.cloneSession, {
    onSuccess: async (newSession) => {
      queryClient.invalidateQueries([QUERY_KEY_SESSIONS]);
      return newSession;
    },
  });
}

/**
 * Hook to delete a session. Optionally backs up session and its connections to recycle bin.
 * @returns Mutation that accepts a session ID to delete.
 */
export function useDeleteSession() {
  const queryClient = useQueryClient();
  const { mutateAsync: addRecycleBinItem } = useAddRecycleBinItem();
  const { data: sessions } = useGetSessions();
  const isSoftDeleteModeSetting = useIsSoftDeleteModeSetting();

  return useMutation<{ deletedSessionId: string; connections: SqluiCore.ConnectionProps[] }, void, string>(
    async (sessionId: string) => {
      // fetch connections before deleting, so we can back them up
      let connections: SqluiCore.ConnectionProps[] = [];
      if (isSoftDeleteModeSetting) {
        try {
          connections = await dataApi.getConnectionsBySessionId(sessionId);
        } catch (err) {
          // if we can't fetch connections, proceed with session-only backup
        }
      }

      const deletedSessionId = await dataApi.deleteSession(sessionId);
      return { deletedSessionId, connections };
    },
    {
      onSuccess: async ({ deletedSessionId, connections }) => {
        queryClient.invalidateQueries([QUERY_KEY_SESSIONS]);

        try {
          if (isSoftDeleteModeSetting) {
            const sessionToBackup = sessions?.find((session) => session.id === deletedSessionId);

            if (sessionToBackup) {
              // strip status from connections before backup
              const connectionsToBackup = connections.map(({ status, ...rest }) => rest as SqluiCore.ConnectionProps);

              await addRecycleBinItem({
                type: "Session",
                name: sessionToBackup.name,
                data: sessionToBackup,
                connections: connectionsToBackup,
              });
            }
          }
        } catch (err) {
          // TODO: add error handling
        }

        return deletedSessionId;
      },
    },
  );
}
