import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ActionDialogs from 'src/frontend/components/ActionDialogs';
import { allMenuKeys } from 'src/frontend/components/MissionControl';
import { getRandomSessionId, setCurrentSessionId } from 'src/frontend/data/session';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import {
  useGetCurrentSession,
  useGetOpenedSessionIds,
  useGetSessions,
  useSetOpenSession,
  useUpsertSession,
} from 'src/frontend/hooks/useSession';
import SessionSelectionForm from 'src/frontend/components/SessionSelectionForm';

export default function SessionSelectionModal() {
  const navigate = useNavigate();
  const { modal, choice, confirm, prompt, alert, dismiss: dismissDialog } = useActionDialogs();
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: openedSessionIds, isLoading: loadingOpenedSessionIds } = useGetOpenedSessionIds();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const isLoading = loadingSessions || loadingOpenedSessionIds || loadingOpenedSessionIds;
  const { mutateAsync: setOpenSession } = useSetOpenSession();
  const { mutateAsync: upsertSession } = useUpsertSession();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    async function _init() {
      try {
        try {
          window.toggleElectronMenu(false, allMenuKeys);
        } catch (err) {}

        window.document.title = 'Choose a Session';

        const options = [
          ...(sessions || []).map((session) => {
            const isSessionOpenedInAnotherWindow =
              openedSessionIds && openedSessionIds?.indexOf(session.id) >= 0;

            return {
              label: session.name,
              value: session.id,
              disabled: isSessionOpenedInAnotherWindow,
              selected: session.id === currentSession?.id || isSessionOpenedInAnotherWindow,
            };
          }),
        ].filter((option) => {
          if (option.disabled) {
            option.label += ` (Already Selected in another Window)`;
          }
          return option;
        }); // here we want to hide


        const enabledOptions = options.filter(option => option.disabled !== true);

        if(enabledOptions.length === 1 && enabledOptions[0].value){
          // only one active session, let's select it
          const newSessionId = enabledOptions[0].value;

          // set the new session id;
          await setOpenSession(newSessionId);

          // go back to homepage before switching session
          navigate('/', { replace: true });

          // then set it as current session
          await setCurrentSessionId(newSessionId);
          return;
        }

        await modal({
          title: 'Choose a Session',
          message: <SessionSelectionForm options={options} isFirstTime={true} />,
          size: 'sm',
          disableBackdropClick: true,
        });
      } catch (err) {}
    }

    _init();
  }, [currentSession, sessions, openedSessionIds, isLoading]);

  return null;
}
