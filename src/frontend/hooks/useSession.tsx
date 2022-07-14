import { QueryClient, useMutation, useQuery, useQueryClient } from 'react-query';
import { useEffect } from 'react';
import dataApi from 'src/frontend/data/api';
import {
  DEFAULT_SESSION_NAME,
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
