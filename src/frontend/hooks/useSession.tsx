import { QueryClient, useMutation, useQuery, useQueryClient } from 'react-query';
import dataApi from 'src/frontend/data/api';
import { getCurrentSessionId } from 'src/frontend/data/session';
import { SqluiCore } from 'typings';

const QUERY_KEY_SESSIONS = 'sessions';

// for sessions
export function useGetSessions() {
  return useQuery([QUERY_KEY_SESSIONS], dataApi.getSessions);
}

export function useGetCurrentSession() {
  const { data, ...rest } = useGetSessions();

  const currentMatchedSession = data?.find((session) => session.id === getCurrentSessionId());

  return {
    data: currentMatchedSession,
    ...rest,
  };
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
