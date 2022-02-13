import useMediaQuery from '@mui/material/useMediaQuery';
import { QueryClient } from 'react-query';
import { useMutation } from 'react-query';
import { useQuery } from 'react-query';
import { useQueryClient } from 'react-query';
import dataApi from 'src/data/api';
import { LocalStorageConfig } from 'src/data/config';
import { SessionStorageConfig } from 'src/data/config';
import { getCurrentSessionId } from 'src/data/session';
import { SqluiCore } from 'typings';
import { SqluiFrontend } from 'typings';

const QUERY_KEY_SESSIONS = 'qk.sessions';

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
