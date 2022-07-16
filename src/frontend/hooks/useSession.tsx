import { useNavigate } from 'react-router-dom';
import { QueryClient, useMutation, useQuery, useQueryClient } from 'react-query';
import dataApi from 'src/frontend/data/api';
import { SqluiCore } from 'typings';
import { setCurrentSessionId } from 'src/frontend/data/session';

const QUERY_KEY_SESSIONS = 'sessions';

// for sessions
export function useGetSessions() {
  return useQuery([QUERY_KEY_SESSIONS], dataApi.getSessions, {
    notifyOnChangeProps: ['data', 'error'],
  });
}

export function useGetOpenedSessionIds() {
  return useQuery([QUERY_KEY_SESSIONS, 'opened'], dataApi.getOpenedSessionIds, {
    notifyOnChangeProps: ['data', 'error'],
  });
}

export function useSetOpenSession() {
  const queryClient = useQueryClient();
  return useMutation<void, void, string>(dataApi.setOpenSession, {
    onSuccess: async () => {
      queryClient.invalidateQueries(QUERY_KEY_SESSIONS);
    },
  });
}

export function useGetCurrentSession() {
  return useQuery([QUERY_KEY_SESSIONS, 'current'], dataApi.getSession, {
    notifyOnChangeProps: ['data', 'error'],
  });
}

export function useSelectSession(suppressReload?: boolean) {
  const { mutateAsync: setOpenSession } = useSetOpenSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation<void, void, string>(async(newSessionId: string) => {
    // set the new session id;
    await setOpenSession(newSessionId);

    // go back to homepage before switching session
    navigate('/', { replace: true });

    // then set it as current session
    await setCurrentSessionId(newSessionId, suppressReload);
  });
}

export function useUpsertSession() {
  const queryClient = useQueryClient();
  return useMutation<SqluiCore.Session, void, SqluiCore.CoreSession>(dataApi.upsertSession, {
    onSuccess: async (newSession) => {
      queryClient.invalidateQueries(QUERY_KEY_SESSIONS);
      return newSession;
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation<string, void, string>(dataApi.deleteSession, {
    onSuccess: async (deletedSessionId) => {
      queryClient.invalidateQueries(QUERY_KEY_SESSIONS);
      return deletedSessionId;
    },
  });
}
