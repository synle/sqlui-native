import React, { useEffect, useState, useCallback } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { SqluiCore, SqluiFrontend, SqluiEnums } from 'typings';
import { useConnectionQueries, useConnectionQuery, useActiveConnectionQuery } from 'src/hooks';
import { useCommands, Command } from 'src/components/MissionControl';

interface CommandPaletteProps {
  onSelectCommand: (command: Command) => void;
}

type CommandOption = {
  event: SqluiEnums.ClientEventKey;
  label?: string;
  /**
   * This means that the queries will need to be expanded before showing the command options
   */
  expandQueries?: boolean;
  /**
   * whether or not to attach current query to this command
   */
  useCurrentQuery?: boolean;
};

const ALL_COMMAND_PALETTE_OPTIONS: CommandOption[] = [
  { event: 'clientEvent/showSettings', label: 'Settings' },
  { event: 'clientEvent/import', label: 'Import' },
  { event: 'clientEvent/exportAll', label: 'Export All' },
  { event: 'clientEvent/connection/new', label: 'New Connection' },
  { event: 'clientEvent/query/new', label: 'New Query' },
  { event: 'clientEvent/query/show', label: 'Show Query', expandQueries: true },
  // these 2 commands don't make sense, let's disable it...
  // { event: 'clientEvent/query/showNext', label: 'Show Next Query', useCurrentQuery: true },
  // { event: 'clientEvent/query/showPrev', label: 'Show Prev Query', useCurrentQuery: true },
  { event: 'clientEvent/query/rename', label: 'Rename Current Query', useCurrentQuery: true },
  { event: 'clientEvent/query/export', label: 'Export Current Query', useCurrentQuery: true },
  { event: 'clientEvent/query/duplicate', label: 'Duplicate Current Query', useCurrentQuery: true },
  { event: 'clientEvent/query/close', label: 'Close Current Query', useCurrentQuery: true },
  { event: 'clientEvent/query/closeOther', label: 'Close Other Query', useCurrentQuery: true },
  { event: 'clientEvent/session/switch', label: 'Switch Session' },
  { event: 'clientEvent/session/new', label: 'New Session' },
  { event: 'clientEvent/session/rename', label: 'Rename Current Session' },
];

export default function CommandPalette(props: CommandPaletteProps) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<Command[]>([]);
  const { isLoading: loadingActiveQuery, query: activeQuery } = useActiveConnectionQuery();
  const { isLoading: loadingQueries, queries } = useConnectionQueries();

  const isLoading = loadingActiveQuery || loadingQueries;

  const onSearch = (newText: string) => {
    setText(newText);

    let allOptions: Command[] = [];
    ALL_COMMAND_PALETTE_OPTIONS.forEach((commandOption) => {
      if (commandOption.expandQueries === true) {
        if (queries) {
          for (const query of queries) {
            allOptions.push({
              event: commandOption.event,
              label: `${commandOption.label} > ${query.name}`,
              data: query,
            });
          }
        }
      } else if (commandOption.useCurrentQuery === true) {
        allOptions.push({
          ...commandOption,
          data: activeQuery,
        });
      } else {
        allOptions.push(commandOption);
      }
    });

    const newOptions: Command[] = allOptions
      .filter((command) => {
        return command.label?.toLowerCase().trim().includes(newText.toLowerCase().trim());
      })
      .sort((a, b) => (a.label || '').localeCompare(b.label || ''));

    setOptions(newOptions);
  };

  const onSelectCommand = (command: Command) => {
    props.onSelectCommand(command);
  };

  useEffect(() => {
    onSearch('');
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <div style={{ width: '400px' }}>
      <div>
        <TextField
          value={text}
          onChange={(e) => onSearch(e.target.value)}
          autoFocus
          placeholder='> Type a command here'
          fullWidth
        />
        {options.map((option, idx) => (
          <div key={`${option.event}.${idx}`}>
            <Button onClick={() => onSelectCommand(option)} title={option.event}>
              {option.label}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
