import { useEffect } from "react";
import { useCommands } from "src/frontend/components/MissionControl";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { platform } from "src/frontend/platform";
import { SqluiEnums } from "typings";

/** Listens for native menu command events (Tauri or Electron) and dispatches them
 * to the MissionControl command system. Ignores commands when a dialog is active
 * (except for checkForUpdate). Renders nothing.
 */
export default function NativeEventListener() {
  const { selectCommand } = useCommands();
  const { dialog } = useActionDialogs();

  useEffect(() => {
    const unsubscribe = platform.onAppCommand((data) => {
      if (dialog) {
        switch (data) {
          case "clientEvent/checkForUpdate":
            break;
          default:
            console.log(">> clientEvent Ignored (Active Dialog)", data);
            return;
        }
      }

      console.log(">> clientEvent Executed", data);
      selectCommand({ event: data as SqluiEnums.ClientEventKey });
    });

    return unsubscribe;
  }, [dialog]);

  return null;
}
