import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import fuzzysort from 'fuzzysort';
import { useEffect, useRef, useState } from 'react';
import { Command as CoreCommand } from 'src/frontend/components/MissionControl';
import { useGetConnectionById, useGetConnections } from 'src/frontend/hooks/useConnection';
import {
  useActiveConnectionQuery,
  useConnectionQueries,
} from 'src/frontend/hooks/useConnectionQuery';
import { SqluiEnums } from 'typings';

type Command = CoreCommand & {
  label: string;
};

type CommandPaletteProps = {
  onSelectCommand: (command: Command) => void;
};

type CommandOption = {
  event: SqluiEnums.ClientEventKey;
  label: string;
  /**
   * This means that the queries will need to be expanded before showing the command options
   */
  expandQueries?: boolean;
  /**
   * whether or not to attach current query to this command
   */
  useCurrentQuery?: boolean;
  /**
   * This means that the connections will need to be expanded before showing the command options
   */
  expandConnections?: boolean;
  /**
   * whether or not to attach current connection
   */
  useCurrentConnection?: boolean;
  data?: any;
};

const ALL_COMMAND_PALETTE_OPTIONS: CommandOption[] = [
  { event: 'clientEvent/navigate', label: 'Open Main Query Page', data: '/' },
  { event: 'clientEvent/navigate', label: 'Open Data Migration', data: '/migration' },
  { event: 'clientEvent/navigate', label: 'Open Recycle Bin Page', data: '/recycle_bin' },
  { event: 'clientEvent/navigate', label: 'Open Bookmarks Page', data: '/bookmarks' },
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
    data: 'horizontal',
  },
  {
    event: 'clientEvent/changeQueryTabOrientation',
    label: 'Use Vertical Tab Orientation',
    data: 'vertical',
  },
  {
    event: 'clientEvent/showQueryHelp',
    label: 'Show Query Help',
  },
  { event: 'clientEvent/clearShowHides', label: 'Collapse All Connections' },
  { event: 'clientEvent/changeDarkMode', label: 'Follows System Settings for Dark Mode', data: '' },

  {
    event: 'clientEvent/changeQuerySelectionMode',
    label: 'Open queries in the same tab',
    data: 'same-tab',
  },

  {
    event: 'clientEvent/changeQuerySelectionMode',
    label: 'Open queries in a new tab',
    data: 'new-tab',
  },

  // sessions
  { event: 'clientEvent/session/switch', label: 'Switch Session' },
  { event: 'clientEvent/session/new', label: 'New Session' },
  { event: 'clientEvent/session/rename', label: 'Rename Current Session' },
  { event: 'clientEvent/session/delete', label: 'Delete Current Session' },
  { event: 'clientEvent/session/clone', label: 'Clone Current Session' },

  // connections
  { event: 'clientEvent/connection/new', label: 'New Connection' },
  {
    event: 'clientEvent/connection/delete',
    label: 'Delete Connection',
    expandConnections: true,
  },
  {
    event: 'clientEvent/connection/delete',
    label: 'Delete Current Connection',
    useCurrentConnection: true,
  },
  {
    event: 'clientEvent/connection/refresh',
    label: 'Refresh Current Connection',
    useCurrentConnection: true,
  },

  // queries
  { event: 'clientEvent/query/new', label: 'New Query' },
  { event: 'clientEvent/query/show', label: 'Show Query', expandQueries: true },
  { event: 'clientEvent/query/rename', label: 'Rename Current Query', useCurrentQuery: true },
  { event: 'clientEvent/query/export', label: 'Export Current Query', useCurrentQuery: true },
  { event: 'clientEvent/query/duplicate', label: 'Duplicate Current Query', useCurrentQuery: true },
  { event: 'clientEvent/query/close', label: 'Close Current Query', useCurrentQuery: true },
  { event: 'clientEvent/query/closeOther', label: 'Close Other Query', useCurrentQuery: true },
  { event: 'clientEvent/query/reveal', label: 'Reveal Query Connection', useCurrentQuery: true },
  {
    event: 'clientEvent/query/closeToTheRight',
    label: 'Close Tabs to The Right Of Current Query',
    useCurrentQuery: true,
  },
  { event: 'clientEvent/checkForUpdate', label: 'Check For Update' },
];

export default function CommandPalette(props: CommandPaletteProps) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState<Command[]>([]);
  const [allOptions, setAllOptions] = useState<Command[]>([]);
  const refOption = useRef<HTMLDivElement>(null);
  const { isLoading: loadingActiveQuery, query: activeQuery } = useActiveConnectionQuery();
  const { isLoading: loadingQueries, queries } = useConnectionQueries();
  const { isLoading: loadingActiveConnection, data: activeConnection } = useGetConnectionById(
    activeQuery?.connectionId,
  );
  const { data: connections, isLoading: loadingConnections } = useGetConnections();

  const isLoading =
    loadingActiveQuery || loadingQueries || loadingActiveConnection || loadingConnections;

  useEffect(() => {
    let newAllOptions: Command[] = [];
    ALL_COMMAND_PALETTE_OPTIONS.forEach((commandOption) => {
      if (commandOption.expandQueries === true) {
        if (queries && queries?.length > 0) {
          for (const query of queries) {
            newAllOptions.push({
              event: commandOption.event,
              label: `${commandOption.label} > ${query.name}`,
              data: query,
            });
          }
        }
      } else if (commandOption.useCurrentQuery === true) {
        if (activeQuery) {
          newAllOptions.push({
            ...commandOption,
            data: activeQuery,
          });
        }
      } else if (commandOption.expandConnections === true) {
        if (connections && connections.length > 0) {
          for (const connection of connections) {
            newAllOptions.push({
              event: commandOption.event,
              label: `${commandOption.label} > ${connection.name}`,
              data: connection,
            });
          }
        }
      } else if (commandOption.useCurrentConnection === true) {
        if (activeConnection) {
          newAllOptions.push({
            ...commandOption,
            data: activeConnection,
          });
        }
      } else {
        newAllOptions.push(commandOption);
      }
    });

    setAllOptions(newAllOptions);

    // filter out the options
    let newOptions: Command[] = newAllOptions;

    if (text) {
      newOptions = fuzzysort
        .go(text, newOptions, { key: 'label', allowTypo: false })
        .map((result) => result.obj);
    }

    setOptions(newOptions);
  }, [queries, activeQuery, text]);

  const onSelectCommand = (command: Command) => {
    props.onSelectCommand(command);
  };

  const onTextboxKeyDown = (e: React.KeyboardEvent) => {
    if (!refOption || !refOption.current) {
      return;
    }

    let moveDirection: number | undefined;

    switch (e.key) {
      case 'Enter':
        if ((e.target as HTMLInputElement).type === 'text') {
          moveDirection = -1;
        }
        break;
      case 'ArrowDown':
        moveDirection = 1;
        break;
      case 'ArrowUp':
        moveDirection = -1;
        break;
    }

    if (moveDirection !== undefined) {
      e.preventDefault();

      const allOptions = [...refOption?.current?.querySelectorAll('.CommandPalette__Option')];

      let selectedElem = refOption?.current?.querySelector('.CommandPalette__Option:focus');
      let nextIndex = selectedElem ? allOptions.indexOf(selectedElem) + moveDirection : 0;

      if (nextIndex < 0) {
        nextIndex = 0;
      }

      if (nextIndex >= allOptions.length) {
        nextIndex = allOptions.length - 1;
      }

      (
        refOption?.current?.querySelectorAll('.CommandPalette__Option')[
          nextIndex
        ] as HTMLButtonElement
      )?.focus();
    }
  };

  if (isLoading) {
    return null;
  }

  let optionsToShow = options.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  const getFormattedLabel = (label: string) => {
    if (text) {
      const res = fuzzysort.single(text, label);
      if (res) {
        return (
          fuzzysort.highlight(res, '<span class="CommandPalette__Highlight">', '</span>') || ''
        );
      }
    }

    return label;
  };

  return (
    <section ref={refOption} onKeyDown={(e) => onTextboxKeyDown(e)}>
      <div>
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          placeholder='> Type a command here'
          fullWidth
          size='small'
          autoComplete='off'
        />
      </div>
      <List dense sx={{ mt: 1 }}>
        {optionsToShow.map((option, idx) => (
          <ListItem
            button
            className='CommandPalette__Option'
            key={`${option.event}.${idx}`}
            onClick={() => onSelectCommand(option)}
            title={option.event}>
            <ListItemText primary={option.label} />
          </ListItem>
        ))}
      </List>
    </section>
  );
}
