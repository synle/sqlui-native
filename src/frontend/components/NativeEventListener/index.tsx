import { useEffect } from "react";
import { useCommands } from "src/frontend/components/MissionControl";
import { useShowAboutDialog } from "src/frontend/components/AboutDialog";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { platform } from "src/frontend/platform";
import { SqluiEnums } from "typings";

/** Global commands that work on every page, even without MissionControl. */
const GLOBAL_COMMANDS = new Set(["clientEvent/checkForUpdate"]);

/** Listens for native menu command events (Tauri or Electron) and dispatches them
 * to the MissionControl command system. Global commands like checkForUpdate are
 * handled directly so they work on all pages (including session select).
 * Renders nothing.
 */
export default function NativeEventListener() {
  const { selectCommand } = useCommands();
  const { dialog } = useActionDialogs();
  const showAboutDialog = useShowAboutDialog();

  useEffect(() => {
    const unsubscribe = platform.onAppCommand((data) => {
      // Global commands bypass dialog check and MissionControl
      if (data === "clientEvent/checkForUpdate") {
        showAboutDialog();
        return;
      }

      if (dialog) {
        console.log(">> clientEvent Ignored (Active Dialog)", data);
        return;
      }

      console.log(">> clientEvent Executed", data);
      selectCommand({ event: data as SqluiEnums.ClientEventKey });
    });

    return unsubscribe;
  }, [dialog]);

  return null;
}
