import { QueryClient, useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import dataApi from 'src/frontend/data/api';
import { setCurrentSessionId } from 'src/frontend/data/session';
import { SqluiCore } from 'typings';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';

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
  return useMutation<Record<string, string>, void, string>(dataApi.setOpenSession, {
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
  const { alert, dismiss: dismissDialog } = useActionDialogs();
  return useMutation<void, void, string>(async (newSessionId: string) => {
    // set the new session id;
    const {outcome} = await setOpenSession(newSessionId);

    if(outcome === 'create_new_session'){
      // if this is a brand new session that we can focus on
      // go back to homepage before switching session
      navigate('/', { replace: true });

      // then set it as current session
      await setCurrentSessionId(newSessionId, suppressReload);
    } else {
      // let's close this modal and show an alert
      await dismissDialog();
      await alert(`The window with this sessionId is now focused.`);
    }
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
