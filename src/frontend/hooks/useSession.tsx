import { QueryClient, useMutation, useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import dataApi from 'src/frontend/data/api';
import {
  DEFAULT_SESSION_NAME,
  getCurrentSessionId,
  setCurrentSessionId,
} from 'src/frontend/data/session';
import { SqluiCore } from 'typings';

const QUERY_KEY_SESSIONS = 'sessions';

// for sessions
export function useGetSessions() {
  return useQuery([QUERY_KEY_SESSIONS], dataApi.getSessions, {
    notifyOnChangeProps: ['data', 'error'],
  });
}

export function useGetCurrentSession() {
  const { data, ...rest } = useGetSessions();

  const currentMatchedSession = data?.find((session) => session.id === getCurrentSessionId());

  useEffect(() => {
    if (data) {
      if (!currentMatchedSession) {
        // special case where user is still accessing the deleted session id
        // switch this back to default session
        setCurrentSessionId(DEFAULT_SESSION_NAME);
      }
    }
  }, [data, currentMatchedSession]);

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
