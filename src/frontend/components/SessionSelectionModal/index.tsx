import { useEffect } from "react";
import { allMenuKeys } from "src/frontend/components/MissionControl";
import SessionSelectionForm from "src/frontend/components/SessionSelectionForm";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useGetCurrentSession, useGetOpenedSessionIds, useGetSessions } from "src/frontend/hooks/useSession";

export default function SessionSelectionModal() {
  const { modal } = useActionDialogs();
  const { isLoading: loadingSessions } = useGetSessions();
  const { isLoading: loadingOpenedSessionIds } = useGetOpenedSessionIds();
  const { isLoading: loadingCurrentSession, data: currentSession } = useGetCurrentSession();
  const isLoading = loadingSessions || loadingOpenedSessionIds || loadingCurrentSession;

  useEffect(() => {
    if (isLoading && currentSession) {
      return;
    }

    async function _init() {
      try {
        try {
          window.toggleElectronMenu(false, allMenuKeys);
        } catch (err) {}

        window.document.title = "Choose a Session";

        await modal({
          title: "Choose a Session",
          message: <SessionSelectionForm isFirstTime={true} />,
          size: "sm",
          disableBackdropClick: true,
        });
      } catch (err) {}
    }

    _init();
  }, [isLoading, currentSession]);

  return null;
}
