import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { SqluiCore, SqluiFrontend, SqluiEnums } from 'typings';
import { useCommands } from 'src/components/MissionControl';

export default function ElectronEventListener() {
  const { selectCommand } = useCommands();
  useEffect(() => {
    //@ts-ignore
    window?.ipcRenderer?.on('sqluiNativeEvent/ipcElectronCommand', (event, data) => {
      console.log('>> clientEvent.import', event, data);
      selectCommand({
        event: data,
      });
    });
  }, []);
  return null;
}
