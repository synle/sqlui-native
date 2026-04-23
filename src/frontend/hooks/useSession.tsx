import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";
import { getCurrentSessionId, setCurrentSessionId } from "src/frontend/data/session";
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
  return useQuery({
    queryKey: [QUERY_KEY_SESSIONS],
    queryFn: dataApi.getSessions,
    notifyOnChangeProps: ["data", "error"],
  });
}

/**
 * Hook to fetch the current active session for this window.
 * @returns React Query result containing the current session.
 */
export function useGetCurrentSession() {
  return useQuery({
    queryKey: [QUERY_KEY_SESSIONS, "current"],
    queryFn: dataApi.getSession,
    enabled: !!getCurrentSessionId(),
    notifyOnChangeProps: ["data", "error", "status"],
  });
}

/**
 * Hook to switch to a different session.
 * @param suppressReload - If true, suppresses page reload after switching sessions.
 * @returns Mutation that accepts a session ID to select.
 */
export function useSelectSession(suppressReload?: boolean) {
  return useMutation<void, void, string>({
    mutationFn: async (newSessionId: string) => {
      await setCurrentSessionId(newSessionId, suppressReload);
    },
  });
}

/**
 * Hook to create or update a session.
 * @returns Mutation that accepts session properties and returns the upserted session.
 */
export function useUpsertSession() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.Session, void, SqluiCore.CoreSession>({
    mutationFn: dataApi.upsertSession,
    onSuccess: async (newSession) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SESSIONS] });
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
  return useMutation<SqluiCore.Session, void, SqluiCore.CoreSession>({
    mutationFn: dataApi.cloneSession,
    onSuccess: async (newSession) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SESSIONS] });
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

  return useMutation<{ deletedSessionId: string; connections: SqluiCore.ConnectionProps[] }, void, string>({
    mutationFn: async (sessionId: string) => {
      // fetch connections before deleting, so we can back them up
      let connections: SqluiCore.ConnectionProps[] = [];
      if (isSoftDeleteModeSetting) {
        try {
          connections = await dataApi.getConnectionsBySessionId(sessionId);
        } catch (err) {
          console.error("useSession.tsx:getConnectionsBySessionId", err);
          // if we can't fetch connections, proceed with session-only backup
        }
      }

      const deletedSessionId = await dataApi.deleteSession(sessionId);
      return { deletedSessionId, connections };
    },
    onSuccess: async ({ deletedSessionId, connections }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_SESSIONS] });

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
        console.error("useSession.tsx:addRecycleBinItem", err);
        // TODO: add error handling
      }

      return deletedSessionId;
    },
  });
}
