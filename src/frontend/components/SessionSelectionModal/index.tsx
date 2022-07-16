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
  const { isLoading: loadingSessions } = useGetSessions();
  const { isLoading: loadingOpenedSessionIds } = useGetOpenedSessionIds();
  const { isLoading: loadingCurrentSession } = useGetCurrentSession();
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

        await modal({
          title: 'Choose a Session',
          message: <SessionSelectionForm isFirstTime={true} />,
          size: 'sm',
          disableBackdropClick: true,
        });
      } catch (err) {}
    }

    _init();
  }, [ isLoading]);

  return null;
}
