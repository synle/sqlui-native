import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ActionDialogs from 'src/frontend/components/ActionDialogs';
import { allMenuKeys } from 'src/frontend/components/MissionControl';
import SessionSelectionForm, {SessionOption} from 'src/frontend/components/SessionSelectionForm';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import {
  useGetCurrentSession,
  useGetOpenedSessionIds,
  useGetSessions,
} from 'src/frontend/hooks/useSession';

export default function SessionSelectionModal() {
  const navigate = useNavigate();
  const { modal, choice, confirm, prompt, alert, dismiss: dismissDialog } = useActionDialogs();
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: openedSessionIds, isLoading: loadingOpenedSessionIds } = useGetOpenedSessionIds();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const isLoading = loadingSessions || loadingOpenedSessionIds || loadingOpenedSessionIds;

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

        const options : SessionOption[] = [
          ...(sessions || []).map((session) => {
            const isSessionOpenedInAnotherWindow =
              openedSessionIds && openedSessionIds?.indexOf(session.id) >= 0;

            const label = session.name;
            const value = session.id;

            return {
              label,
              subtitle: '',
              value,
              disabled: isSessionOpenedInAnotherWindow,
              selected: session.id === currentSession?.id || isSessionOpenedInAnotherWindow,
            };
          }),
        ].map((option) => {
          if (option.disabled) {
            option.subtitle = `Selected in another Window`;
          }
          return option;
        });

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
