import { useEffect } from "react";
import { useCommands } from "src/frontend/components/MissionControl";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";

/**
 * Listens for menu commands from the Tauri shell (or Electron IPC for backward compat)
 * and dispatches them to the MissionControl command system.
 * Ignores commands when a dialog is active (except for checkForUpdate).
 * Renders nothing.
 * @returns null
 */
export default function ElectronEventListener() {
  const { selectCommand } = useCommands();
  const { dialog } = useActionDialogs();

  useEffect(() => {
    // Tauri mode: listen for "menu-command" events from the Rust backend
    if ((window as any).isTauri) {
      let unlisten: (() => void) | undefined;

      import("@tauri-apps/api/event").then(({ listen }) => {
        listen<string>("menu-command", (event) => {
          const data = event.payload;

          if (dialog) {
            switch (data) {
              case "clientEvent/checkForUpdate":
                break;
              default:
                console.log(">> clientEvent Ignored (Active Dialog)", data);
                return;
            }
          }

          // Handle "File a bug" by opening the URL directly
          if (data === "clientEvent/openBugReport") {
            window.openBrowserLink("https://github.com/synle/sqlui-native/issues/new");
            return;
          }

          console.log(">> clientEvent Executed", data);
          selectCommand({ event: data });
        }).then((fn) => {
          unlisten = fn;
        });
      });

      return () => {
        if (unlisten) unlisten();
      };
    }

    return undefined;
  }, [dialog]);

  return null;
}
