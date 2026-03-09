import { useEffect } from "react";
import { useCommands } from "src/frontend/components/MissionControl";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";

/**
 * Listens for IPC commands from the Electron main process and dispatches them
 * to the MissionControl command system. Ignores commands when a dialog is active
 * (except for checkForUpdate). Renders nothing.
 * @returns null
 */
export default function ElectronEventListener() {
  const { selectCommand } = useCommands();
  const { dialog } = useActionDialogs();

  useEffect(() => {
    window?.ipcRenderer?.on("sqluiNativeEvent/ipcElectronCommand", (event, data) => {
      if (dialog) {
        switch (data) {
          case "clientEvent/checkForUpdate":
            break;
          default:
            // if there is already a dialog, then ignore this command
            console.log(">> clientEvent Ignored (Active Dialog)", event, data);
            return; // early exits
        }
      }

      console.log(">> clientEvent Executed", event, data);
      selectCommand({
        event: data,
      });
    });

    return () => {
      window?.ipcRenderer?.removeAllListeners("sqluiNativeEvent/ipcElectronCommand");
    };
  }, [dialog]);
  return null;
}
