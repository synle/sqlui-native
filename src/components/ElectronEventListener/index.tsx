import { useEffect } from 'react';
import { useCommands } from 'src/components/MissionControl';
import { useActionDialogs } from 'src/hooks/useActionDialogs';

export default function ElectronEventListener() {
  const { selectCommand } = useCommands();
  const { dialog } = useActionDialogs();

  useEffect(() => {
    window?.ipcRenderer?.on('sqluiNativeEvent/ipcElectronCommand', (event, data) => {
      if (dialog) {
        switch (data) {
          case 'clientEvent/checkForUpdate':
            break;
          default:
            // if there is already a dialog, then ignore this command
            console.log('>> clientEvent Ignored (Active Dialog)', event, data);
            return; // early exits
        }
      }

      console.log('>> clientEvent Executed', event, data);
      selectCommand({
        event: data,
      });
    });

    return () => {
      window?.ipcRenderer?.removeAllListeners('sqluiNativeEvent/ipcElectronCommand');
    };
  }, [dialog]);
  return null;
}
