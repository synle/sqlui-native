import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Tooltip from '@mui/material/Tooltip';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import AddIcon from '@mui/icons-material/Add';
import Avatar from '@mui/material/Avatar';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import AppsIcon from '@mui/icons-material/Apps';
import EditIcon from '@mui/icons-material/Edit';
import PhotoSizeSelectSmallIcon from '@mui/icons-material/PhotoSizeSelectSmall';
import Link from '@mui/material/Link';
import { SqluiCore, SqluiFrontend, SqluiEnums } from 'typings';
import { useActionDialogs } from 'src/components/ActionDialogs';
import { downloadText } from 'src/data/file';
import {
  useExecute,
  useConnectionQueries,
  useConnectionQuery,
  useActiveConnectionQuery,
  useGetSessions,
  useUpsertSession,
  useDeleteSession,
  useGetCurrentSession,
  useGetConnections,
  useImportConnection,
  getExportedConnection,
  getExportedQuery,
} from 'src/hooks';
import {
  getCurrentSessionId,
  getDefaultSessionId,
  setCurrentSessionId,
  getRandomSessionId,
} from 'src/data/session';
import CommandPalette from 'src/components/CommandPalette';
import appPackage from 'src/package.json';

export interface Command {
  event: SqluiEnums.ClientEventKey;
  data?: unknown;
  label?: string;
}

const QUERY_KEY_COMMAND_PALETTE = 'commandPalette';
const _commands: Command[] = [];
export function useCommands() {
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery(QUERY_KEY_COMMAND_PALETTE, () => _commands);

  const command = _commands[_commands.length - 1];

  const selectCommand = (command: Command) => {
    _commands.push(command);
    queryClient.invalidateQueries(QUERY_KEY_COMMAND_PALETTE);
  };

  const dismissCommand = () => {
    if (_commands.length > 0) {
      _commands.pop();
    }
    queryClient.invalidateQueries(QUERY_KEY_COMMAND_PALETTE);
  };

  return {
    command,
    selectCommand,
    dismissCommand,
  };
}

const allMenuKeys = [
  'menu-connection-new',
  'menu-import',
  'menu-export',
  'menu-query-new',
  'menu-query-prev',
  'menu-query-next',
  'menu-query-close',
  'menu-session-rename',
  'menu-session-switch',
];

export default function MissionControl() {
  const navigate = useNavigate();
  const [init, setInit] = useState(false);
  const {
    queries,
    onAddQuery,
    onShowQuery,
    onChangeQuery,
    onDeleteQueries,
    onDuplicateQuery: _onDuplicateQuery,
    onImportQuery,
    isLoading: loadingQueries,
  } = useConnectionQueries();
  const { query: activeQuery } = useActiveConnectionQuery();
  const { command, selectCommand, dismissCommand } = useCommands();
  const { modal, choice, confirm, prompt, alert, dismiss: dismissDialog } = useActionDialogs();
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { mutateAsync: importConnection } = useImportConnection();
  const { data: connections, isLoading: loadingConnections } = useGetConnections();

  const onCloseQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      await confirm('Do you want to delete this query?');
      onDeleteQueries([query.id]);
    } catch (err) {
      //@ts-ignore
    }
  };

  const onCloseOtherQueries = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      await confirm('Do you want to close other queries?');
      onDeleteQueries(queries?.map((q) => q.id).filter((queryId) => queryId !== query.id));
    } catch (err) {
      //@ts-ignore
    }
  };

  const onRenameQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      const newName = await prompt({
        title: 'Rename Query',
        message: 'New Query Name',
        value: query.name,
        saveLabel: 'Save',
      });
      onChangeQuery(query.id, {
        name: newName,
      });
    } catch (err) {
      //@ts-ignore
    }
  };

  const onDuplicateQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    _onDuplicateQuery(query.id);
  };

  const onExportQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    downloadText(
      `${query.name}.query.json`,
      JSON.stringify([getExportedQuery(query)], null, 2),
      'text/json',
    );
  };

  const onShowQueryWithDirection = (direction: number) => {
    if (!queries || !activeQuery) {
      return;
    }

    let targetIdx = queries?.findIndex((q) => q.id === activeQuery.id);

    if (targetIdx !== -1) {
      targetIdx = targetIdx + direction;

      // these are handler to rotate the search
      if (targetIdx >= queries.length) {
        targetIdx = 0;
      }

      if (targetIdx < 0) {
        targetIdx = queries.length - 1;
      }

      // then show that tab
      onShowQuery(queries[targetIdx].id);
    }
  };

  const onChangeSession = async () => {
    if (!sessions) {
      return;
    }

    try {
      const options = [
        ...sessions.map((session) => ({
          label: session.name,
          value: session.id,
          startIcon:
            session.id === currentSession?.id ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />,
        })),
        {
          label: 'New Session',
          value: 'newSession',
          startIcon: <AddIcon />,
        },
      ];

      const selected = await choice('Choose a session', undefined, options);

      // make an api call to update my session to this
      if (selected === 'newSession') {
        onAddSession();
      } else {
        // switching session
        if (currentSession?.id === selected) {
          // if they select the same session, just ignore it
          return;
        }
        const newSession: SqluiCore.Session | undefined = sessions.find(
          (session) => session.id === selected,
        );
        if (!newSession) {
          return;
        }

        // then set it as current session
        setCurrentSessionId(newSession.id);

        // reload the page just in case
        // TODO: see if we need to use a separate row
        navigate('/', { replace: true });
        window.location.reload();
      }
    } catch (err) {
      //@ts-ignore
    }
  };

  const onAddSession = async () => {
    // create the new session
    // if there is no session, let's create the session
    const newSessionName = await prompt({
      title: 'New Session',
      message: 'New Session Name',
      value: `Session ${new Date().toLocaleString()}`,
      saveLabel: 'Save',
      required: true,
    });

    if (!newSessionName) {
      return;
    }

    const newSession = await upsertSession({
      id: getRandomSessionId(),
      name: newSessionName,
    });

    if (!newSession) {
      return;
    }

    // then set it as current session
    setCurrentSessionId(newSession.id);

    // reload the page just in case
    // TODO: see if we need to use a separate row
    navigate('/', { replace: true });
    window.location.reload();
  };

  const onRenameSession = async () => {
    try {
      if (!currentSession) {
        return;
      }

      const newSessionName = await prompt({
        title: 'Rename Session',
        message: 'New Session Session',
        value: currentSession.name,
        saveLabel: 'Save',
      });

      if (!newSessionName) {
        return;
      }

      await upsertSession({
        ...currentSession,
        name: newSessionName,
      });
    } catch (err) {
      //@ts-ignore
    }
  };

  const onExportAll = async () => {
    let jsonContent: any[] = [];

    // TODO: implement export all
    if (connections) {
      for (const connection of connections) {
        jsonContent.push(getExportedConnection(connection));
      }
    }

    if (queries) {
      for (const query of queries) {
        jsonContent.push(getExportedQuery(query));
      }
    }

    downloadText(
      `${new Date().toLocaleString()}.sqlui_native.json`,
      JSON.stringify(jsonContent, null, 2),
      'text/json',
    );
  };

  const onNewConnection = useCallback(() => navigate('/connection/new'), []);

  const onImport = async () => {
    try {
      const rawJson = await prompt({
        title: 'Import Connections / Queries',
        message: 'Import',
        saveLabel: 'Import',
        value: '',
        required: true,
        isLongPrompt: true,
      });

      let jsonRows: any[];
      try {
        jsonRows = JSON.parse(rawJson || '');
      } catch (err) {
        return alert(`Import failed. Invalid JSON config`);
      }

      // here we will attempt to import all the connections first before queries
      jsonRows = jsonRows.sort((a, b) => {
        return a._type.localeCompare(b._type); //note that query will go after connection (q > c)
      });

      /// check for duplicate id
      const hasDuplicateIds =
        new Set([...jsonRows.map((jsonRow) => jsonRow.id)]).size !== jsonRows.length;
      if (hasDuplicateIds) {
        return alert(`Import failed. JSON Config includes duplicate IDs.`);
      }

      let failedCount = 0,
        successCount = 0;
      for (const jsonRow of jsonRows) {
        try {
          const { _type, ...rawImportMetaData } = jsonRow;
          switch (_type) {
            case 'connection':
              await importConnection(rawImportMetaData);
              break;
            case 'query':
              await onImportQuery(jsonRow);
              break;
          }
          successCount++;
        } catch (err) {
          console.log('>> Import Failed', jsonRow, err);
          failedCount++;
        }
      }

      alert(`Import finished with ${successCount} successes and ${failedCount} failures`);
    } catch (err) {
      //@ts-ignore
    }
  };

  const onShowCommandPalette = async () => {
    try {
      const onSelectCommand = (command: Command) => {
        dismissDialog();
        _executeCommandPalette(command);
      };
      await modal({
        title: 'Control Palette',
        message: <CommandPalette onSelectCommand={onSelectCommand} />,
      });
    } catch (err) {
      //@ts-ignore
    }
  };

  const onCheckForUpdate = async () => {
    let contentDom : React.ReactNode;

    const newVersion = await fetch('https://synle.github.io/sqlui-native/package.json').then(r => r.json()).then(r => r.version)

    if(newVersion === appPackage.version){
      contentDom = <div>
      <Typography gutterBottom={true}>sqlui-native is up to date</Typography>
      <Typography gutterBottom={true} sx={{mt: 3}}>Version {appPackage.version}</Typography>
      </div>
    } else {
      const platform = window?.process?.platform;
      const downloadLink = platform === 'darwin'
          ? `https://github.com/synle/sqlui-native/releases/download/${newVersion}/sqlui-native-${newVersion}.dmg`
          : `https://github.com/synle/sqlui-native/releases/download/${newVersion}/sqlui-native-${newVersion}.exe`;

      contentDom = <div>
        <Typography gutterBottom={true}>Your version {appPackage.version} </Typography>
        <Typography gutterBottom={true}>Latest version {newVersion} </Typography>
        <Typography gutterBottom={true} sx={{mt: 3}}><Link href={downloadLink}>Click here to download the new version</Link>.</Typography>
      </div>
    }

    await modal({
      title: 'Check for update',
      message: contentDom,
    });
  }

  // mission control commands
  async function _executeCommandPalette(command: Command) {
    if (command) {
      dismissCommand();

      switch (command.event) {
        case 'clientEvent/showCommandPalette':
          onShowCommandPalette();
          break;

        case 'clientEvent/checkForUpdate':
          onCheckForUpdate();
          break;

        // overall commands
        case 'clientEvent/import':
          try {
            //@ts-ignore
            window.toggleElectronMenu(false, allMenuKeys);
            await onImport();
          } catch (err) {
            //@ts-ignore
          }

          //@ts-ignore
          window.toggleElectronMenu(true, allMenuKeys);
          break;
        case 'clientEvent/exportAll':
          onExportAll();
          break;

        // connection commands
        case 'clientEvent/connection/new':
          onNewConnection();
          break;

        // query commands
        case 'clientEvent/query/new':
          onAddQuery();
          break;
        case 'clientEvent/query/show':
          if (command.data) {
            onShowQuery((command.data as SqluiFrontend.ConnectionQuery).id);
          }
          break;
        case 'clientEvent/query/showNext':
        case 'clientEvent/query/showPrev':
          onShowQueryWithDirection(command.event === 'clientEvent/query/showNext' ? 1 : -1);
          break;
        case 'clientEvent/query/rename':
          if (command.data) {
            onRenameQuery(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;
        case 'clientEvent/query/export':
          if (command.data) {
            onExportQuery(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;
        case 'clientEvent/query/duplicate':
          if (command.data) {
            onDuplicateQuery(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;
        case 'clientEvent/query/close':
          if (command.data) {
            onCloseQuery(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;
        case 'clientEvent/query/closeOther':
          if (command.data) {
            onCloseOtherQueries(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;
        case 'clientEvent/query/closeCurrentlySelected':
          // this closes the active query
          if (activeQuery) {
            onCloseQuery(activeQuery);
          }
          break;

        // session commands
        case 'clientEvent/session/switch':
          try {
            //@ts-ignore
            window.toggleElectronMenu(false, allMenuKeys);
            await onChangeSession();
          } catch (err) {
            //@ts-ignore
          }

          //@ts-ignore
          window.toggleElectronMenu(true, allMenuKeys);
          break;
        case 'clientEvent/session/new':
          try {
            //@ts-ignore
            window.toggleElectronMenu(false, allMenuKeys);
            await onAddSession();
          } catch (err) {
            //@ts-ignore
          }

          //@ts-ignore
          window.toggleElectronMenu(true, allMenuKeys);
          break;
        case 'clientEvent/session/rename':
          try {
            //@ts-ignore
            window.toggleElectronMenu(false, allMenuKeys);
            await onRenameSession();
          } catch (err) {
            //@ts-ignore
          }

          //@ts-ignore
          window.toggleElectronMenu(true, allMenuKeys);
          break;
      }
    }
  }

  useEffect(() => {
    _executeCommandPalette(command);
  }, [command]);

  useEffect(() => {
    // @ts-ignore
    if (window.isElectron) {
      // if it is electron, then let's not create these shortcut here
      // this is mostly for webapp to debug
      return;
    }

    const onKeyboardShortcutEvent = (e: KeyboardEvent) => {
      let onShowCommandPalette = false;
      let preventDefault = false;
      let command: Command | undefined;
      const { key } = e;
      if (e.altKey || e.ctrlKey || e.metaKey) {
        switch (key.toLowerCase()) {
          case 'p':
            command = {
              event: 'clientEvent/showCommandPalette',
            };
            break;
          case 't':
            command = {
              event: 'clientEvent/query/new',
            };
            break;
          case 'o':
            command = {
              event: 'clientEvent/import',
            };
            break;
          case 's':
            command = {
              event: 'clientEvent/exportAll',
            };
            break;
          case 'n':
            command = {
              event: 'clientEvent/connection/new',
            };
            break;
          case 'w':
            command = {
              event: 'clientEvent/query/closeCurrentlySelected',
            };
            break;
        }
      }

      if (preventDefault) {
        e.stopPropagation();
        e.preventDefault();
      }

      if (command) {
        selectCommand(command);
      }
    };

    document.addEventListener('keydown', onKeyboardShortcutEvent);
    return () => {
      document.removeEventListener('keydown', onKeyboardShortcutEvent);
    };
  }, []);

  return null;
}

// TODO: move me to a file
