import { useEffect } from "react";
import { allMenuKeys } from "src/frontend/components/MissionControl";
import { platform } from "src/frontend/platform";
import SessionSelectionForm from "src/frontend/components/SessionSelectionForm";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useGetCurrentSession, useGetSessions } from "src/frontend/hooks/useSession";

/**
 * Modal dialog for initial session selection. Shown when no valid session is detected.
 * Disables Electron menus while active and sets the document title.
 * @returns null (renders via modal dialog side effect).
 */
export default function SessionSelectionModal() {
  const { modal } = useActionDialogs();
  const { isLoading: loadingSessions } = useGetSessions();
  const { isLoading: loadingCurrentSession, data: currentSession } = useGetCurrentSession();
  const isLoading = loadingSessions || loadingCurrentSession;

  useEffect(() => {
    if (isLoading && currentSession) {
      return;
    }

    async function _init() {
      try {
        try {
          platform.toggleMenuItems(false, allMenuKeys);
        } catch (err) {
          console.error("index.tsx:toggleElectronMenu", err);
        }

        window.document.title = "Choose a Session";

        await modal({
          title: "Choose a Session",
          message: <SessionSelectionForm isFirstTime={true} />,
          size: "sm",
          disableBackdropClick: true,
        });
      } catch (err) {
        console.error("index.tsx:modal", err);
      }
    }

    _init();
  }, [isLoading, currentSession]);

  return null;
}
