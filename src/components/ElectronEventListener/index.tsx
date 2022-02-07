import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { SqluiCore, SqluiFrontend, SqluiEnums } from 'typings';
import { useCommands } from 'src/components/MissionControl';
import { useActionDialogs } from 'src/hooks/useActionDialogs';

export default function ElectronEventListener() {
  const { selectCommand } = useCommands();
  const { dialog } = useActionDialogs();

  useEffect(() => {
    //@ts-ignore
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
      //@ts-ignore
      window?.ipcRenderer?.removeAllListeners('sqluiNativeEvent/ipcElectronCommand');
    };
  }, [dialog]);
  return null;
}
