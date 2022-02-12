import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useEffect } from 'react';
import { useState } from 'react';
import { Command } from 'src/components/MissionControl';
import { useActiveConnectionQuery } from 'src/hooks';
import { useConnectionQueries } from 'src/hooks';
import { SqluiEnums } from 'typings';

const MAX_OPTION_TO_SHOW = 20;

type CommandPaletteProps = {
  onSelectCommand: (command: Command) => void;
};

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
  data?: any;
};

const ALL_COMMAND_PALETTE_OPTIONS: CommandOption[] = [
  { event: 'clientEvent/showSettings', label: 'Settings' },
  { event: 'clientEvent/import', label: 'Import' },
  { event: 'clientEvent/exportAll', label: 'Export All' },
  { event: 'clientEvent/changeDarkMode', label: 'Enable Dark Mode', data: 'dark' },
  {
    event: 'clientEvent/changeDarkMode',
    label: 'Disable Dark Mode (Use Light Mode)',
    data: 'light',
  },
  {
    event: 'clientEvent/changeEditorMode',
    label: 'Use advanced editor mode',
    data: 'advanced',
  },
  {
    event: 'clientEvent/changeEditorMode',
    label: 'Use simple editor mode',
    data: 'simple',
  },
  {
    event: 'clientEvent/changeWrapMode',
    label: 'Enable word wrap',
    data: 'wrap',
  },
  {
    event: 'clientEvent/changeWrapMode',
    label: 'Disable word wrap',
    data: '',
  },
  {
    event: 'clientEvent/changeQueryTabOrientation',
    label: 'Use Horizontal Tab Orientation',
    data: 'Horizontal',
  },
  {
    event: 'clientEvent/changeQueryTabOrientation',
    label: 'Use Vertical Tab Orientation',
    data: 'Vertical',
  },
  {
    event: 'clientEvent/showQueryHelp',
    label: 'Show Query Help',
  },
  { event: 'clientEvent/clearShowHides', label: 'Collapse All Connections' },
  { event: 'clientEvent/changeDarkMode', label: 'Follows System Settings for Dark Mode', data: '' },
  { event: 'clientEvent/connection/new', label: 'New Connection' },
  { event: 'clientEvent/session/switch', label: 'Switch Session' },
  { event: 'clientEvent/session/new', label: 'New Session' },
  { event: 'clientEvent/session/rename', label: 'Rename Current Session' },
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
  { event: 'clientEvent/query/reveal', label: 'Reveal Query Connection' },
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

  let optionsToShow = options;

  if (optionsToShow.length > MAX_OPTION_TO_SHOW && text.length === 0) {
    // limit the initial commands
    optionsToShow = optionsToShow.slice(0, MAX_OPTION_TO_SHOW);
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
        {optionsToShow.map((option, idx) => (
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
