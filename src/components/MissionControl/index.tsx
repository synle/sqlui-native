import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { SqluiCore, SqluiFrontend, SqluiEnums } from 'typings';

interface Command {
  event: SqluiEnums.ClientEventKey;
}

const QUERY_KEY_MISSION_CONTROL_COMMAND = 'missionControlCommand';
const _commands: Command[] = [];
export function useCommands() {
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery(QUERY_KEY_MISSION_CONTROL_COMMAND, () => _commands);

  const command = _commands[_commands.length - 1];

  const selectCommand = (command: Command) => {
    _commands.push(command);
    queryClient.invalidateQueries(QUERY_KEY_MISSION_CONTROL_COMMAND);
  };

  const dismissCommand = () => {
    if (_commands.length > 0) {
      _commands.pop();
    }
    queryClient.invalidateQueries(QUERY_KEY_MISSION_CONTROL_COMMAND);
  };

  return {
    command,
    selectCommand,
    dismissCommand,
  };
}
