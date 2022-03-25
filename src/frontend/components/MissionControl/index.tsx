import AddIcon from '@mui/icons-material/Add';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useEffect, useState } from 'react';
import CommandPalette from 'src/frontend/components/CommandPalette';
import Settings from 'src/frontend/components/Settings';
import { downloadText } from 'src/frontend/data/file';
import { getRandomSessionId, setCurrentSessionId } from 'src/frontend/data/session';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import {
  useDeleteConnection,
  useDuplicateConnection,
  useGetConnectionById,
  useGetConnections,
  useImportConnection,
  useRetryConnection,
} from 'src/frontend/hooks/useConnection';
import {
  useActiveConnectionQuery,
  useConnectionQueries,
} from 'src/frontend/hooks/useConnectionQuery';
import {
  useGetCurrentSession,
  useGetSessions,
  useUpsertSession,
} from 'src/frontend/hooks/useSession';
import { useSetting } from 'src/frontend/hooks/useSetting';
import { useShowHide } from 'src/frontend/hooks/useShowHide';
import useToaster from 'src/frontend/hooks/useToaster';
import {
  createSystemNotification,
  getExportedConnection,
  getExportedQuery,
} from 'src/frontend/utils/commonUtils';
import { SqluiCore, SqluiEnums, SqluiFrontend } from 'typings';
import appPackage from 'src/package.json';

export type Command = {
  event: SqluiEnums.ClientEventKey;
  data?: unknown;
  label?: string;
};

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

/**
 * These are all the menu keys that should be disabled when the query tab
 * is not visible. Triggering these events in the background will be confusing
 * @type {Array}
 */
export const allMenuKeys = [
  'menu-connection-new',
  'menu-import',
  'menu-export',
  'menu-query-new',
  'menu-query-rename',
  'menu-query-help',
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
    onOrderingChange: onChangeTabOrdering,
    onImportQuery,
    isLoading: loadingQueries,
  } = useConnectionQueries();
  const { query: activeQuery, onChange: onChangeActiveQuery } = useActiveConnectionQuery();
  const { command, selectCommand, dismissCommand } = useCommands();
  const { modal, choice, confirm, prompt, alert, dismiss: dismissDialog } = useActionDialogs();
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { mutateAsync: importConnection } = useImportConnection();
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { settings, onChange: onChangeSettings } = useSetting();
  const { onClear: onClearConnectionVisibles, onToggle: onToggleConnectionVisible } = useShowHide();
  const { data: activeConnection } = useGetConnectionById(activeQuery?.connectionId);
  const { add: addToast } = useToaster();
  const { mutateAsync: deleteConnection } = useDeleteConnection();
  const { mutateAsync: reconnectConnection } = useRetryConnection();
  const { mutateAsync: duplicateConnection } = useDuplicateConnection();

  const onCloseQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      await confirm(`Do you want to delete this query "${query.name}"?`);

      onDeleteQueries([query.id]);
    } catch (err) {}
  };

  const onCloseOtherQueries = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      await confirm(`Do you want to close other queries except "${query.name}"?`);
      onDeleteQueries(queries?.map((q) => q.id).filter((queryId) => queryId !== query.id));
    } catch (err) {}
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
    } catch (err) {}
  };

  const onDuplicateQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    const curToast = await addToast({
      message: `Duplicating "${query.name}", please wait...`,
    });

    _onDuplicateQuery(query.id);
  };

  const onExportQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    const curToast = await addToast({
      message: `Exporting Query "${query.name}", please wait...`,
    });

    downloadText(
      `${query.name}.query.json`,
      JSON.stringify([getExportedQuery(query)], null, 2),
      'text/json',
    );
  };

  const onRevealQueryConnection = async (query: SqluiFrontend.ConnectionQuery) => {
    const { databaseId, connectionId } = query;

    if (!connectionId) {
      return;
    }

    const branchesToReveal: string[] = [connectionId];

    if (databaseId && connectionId) {
      branchesToReveal.push([connectionId, databaseId].join(' > '));
    }

    for (const branchToReveal of branchesToReveal) {
      // reveal
      onToggleConnectionVisible(branchToReveal, true);
    }

    // scroll to the selected dom
    const curToast = await addToast({
      message: `Revealed selected connection / database on the sidebar`,
    });
    setTimeout(() => {
      const selectedHeaders = document.querySelectorAll('.Accordion__Header.selected');
      selectedHeaders[selectedHeaders.length - 1].scrollIntoView();
    }, 100);
  };

  const onUpdateActiveQuery = async (data: SqluiFrontend.PartialConnectionQuery) => {
    onChangeActiveQuery(data);
  };

  const onShowQueryHelp = async () => {
    let data: string;

    if (activeConnection && activeConnection.dialect) {
      // open query help with selected dialect
      data = `https://synle.github.io/sqlui-native/guides#${activeConnection.dialect}`;
    } else {
      data = `https://synle.github.io/sqlui-native/guides`;
    }

    selectCommand({ event: 'clientEvent/openExternalUrl', data });
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
    } catch (err) {}
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
    } catch (err) {}
  };

  const onExportAll = async () => {
    const curToast = await addToast({
      message: `Exporting All Connections and Queries, please wait...`,
    });

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
  const onDeleteConnection = async (connection: SqluiCore.ConnectionProps) => {
    let curToast;
    try {
      await confirm('Delete this connection?');
      await deleteConnection(connection.id);
      curToast = await addToast({
        message: `Connection "${connection.name}" deleted`,
      });

      createSystemNotification(
        `Connection "${connection.name}" (dialect=${connection.dialect || 'N/A'}) deleted`,
      );
    } catch (err) {
      curToast = await addToast({
        message: `Failed to delete connection "${connection.name}" (dialect=${
          connection.dialect || 'N/A'
        })`,
      });
    }
  };

  const onRefreshConnection = async (connection: SqluiCore.ConnectionProps) => {
    let curToast;

    curToast = await addToast({
      message: `Refreshing connection "${connection.name}", please wait...`,
    });

    let resultMessage = '';
    try {
      await reconnectConnection(connection.id);
      resultMessage = `Successfully connected to "${connection.name}" (dialect=${
        connection.dialect || 'N/A'
      })`;
    } catch (err) {
      resultMessage = `Failed to connect to "${connection.name}"`;
    }

    await curToast.dismiss();
    curToast = await addToast({
      message: resultMessage,
    });

    createSystemNotification(resultMessage);
  };

  const onDuplicateConnection = async (connection: SqluiCore.ConnectionProps) => {
    const curToast = await addToast({
      message: `Duplicating connection "${connection.name}", please wait...`,
    });

    duplicateConnection(connection);
  };

  const onExportConnection = async (connection: SqluiCore.ConnectionProps) => {
    const curToast = await addToast({
      message: `Exporting connection "${connection.name}", please wait...`,
    });

    downloadText(
      `${connection.name}.connection.json`,
      JSON.stringify([getExportedConnection(connection)], null, 2),
      'text/json',
    );
  };

  const onSelectConnection = async (connection: SqluiCore.ConnectionProps) => {
    const curToast = await addToast({
      message: `Connection "${connection.name}" selected for query`,
    });

    selectCommand({
      event: 'clientEvent/query/changeActiveQuery',
      data: {
        connectionId: connection.id,
        databaseId: '',
      },
    });
  };

  const onImport = async (value = '') => {
    try {
      const rawJson = await prompt({
        title: 'Import Connections / Queries',
        message: 'Import',
        saveLabel: 'Import',
        value: value,
        required: true,
        isLongPrompt: true,
      });

      let jsonRows: any[];
      try {
        jsonRows = JSON.parse(rawJson || '');
      } catch (err) {
        return alert(`Import failed. Invalid JSON config`);
      }

      const curToast = await addToast({
        message: 'Importing, please wait...',
      });

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

      await curToast.dismiss();
      alert(`Import finished with ${successCount} successes and ${failedCount} failures`);
    } catch (err) {}
  };

  const onShowCommandPalette = async () => {
    try {
      const onSelectCommand = (command: Command) => {
        dismissDialog();
        _executeCommandPalette(command);
      };
      await modal({
        title: 'Command Palette',
        message: <CommandPalette onSelectCommand={onSelectCommand} />,
        size: 'sm',
      });
    } catch (err) {}
  };

  const onCheckForUpdate = async () => {
    let contentDom: React.ReactNode;

    const newVersion = await fetch('https://synle.github.io/sqlui-native/package.json')
      .then((r) => r.json())
      .then((r) => r.version);

    if (newVersion === appPackage.version) {
      contentDom = (
        <>
          <Typography gutterBottom={true}>sqlui-native is up to date</Typography>
          <Typography gutterBottom={true} sx={{ mt: 3 }}>
            Version {appPackage.version}
          </Typography>
        </>
      );
    } else {
      const platform = window?.process?.platform;
      const downloadLink =
        platform === 'darwin'
          ? `https://github.com/synle/sqlui-native/releases/download/${newVersion}/sqlui-native-${newVersion}.dmg`
          : `https://github.com/synle/sqlui-native/releases/download/${newVersion}/sqlui-native-${newVersion}.exe`;

      const onDownloadLatestVersion = () => {
        selectCommand({ event: 'clientEvent/openExternalUrl', data: downloadLink });
      };

      contentDom = (
        <>
          <Typography gutterBottom={true}>Your version {appPackage.version} </Typography>
          <Typography gutterBottom={true}>Latest version {newVersion} </Typography>
          <Typography gutterBottom={true} sx={{ mt: 3 }}>
            <Link onClick={onDownloadLatestVersion} sx={{ cursor: 'pointer' }}>
              Click here to download the new version
            </Link>
            .
          </Typography>
        </>
      );
    }

    const onGoToHomepage = () => {
      const data = 'https://synle.github.io/sqlui-native/';
      selectCommand({ event: 'clientEvent/openExternalUrl', data });
    };

    await modal({
      title: 'Check for update',
      message: (
        <>
          {contentDom}
          <Typography gutterBottom={true} sx={{ mt: 3 }}>
            <Link onClick={onGoToHomepage} sx={{ cursor: 'pointer' }}>
              synle.github.io/sqlui-native
            </Link>
          </Typography>
        </>
      ),
      showCloseButton: true,
      size: 'xs',
    });
  };

  const onShowSettings = async () => {
    await modal({
      title: 'Settings',
      message: <Settings />,
      showCloseButton: true,
      size: 'xs',
    });
  };

  const onUpdateSetting = (key: SqluiFrontend.SettingKey, newValue: string) => {
    if (!settings) {
      return;
    }

    //@ts-ignore
    settings[key] = newValue;

    onChangeSettings(settings);
  };

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

        case 'clientEvent/showSettings':
          onShowSettings();
          break;

        case 'clientEvent/clearShowHides':
          onClearConnectionVisibles();
          break;

        case 'clientEvent/changeDarkMode':
          onUpdateSetting('darkMode', command.data as string);
          break;

        case 'clientEvent/changeEditorMode':
          onUpdateSetting('editorMode', command.data as string);
          break;

        case 'clientEvent/changeWrapMode':
          onUpdateSetting('wordWrap', command.data as string);
          break;

        case 'clientEvent/changeQueryTabOrientation':
          onUpdateSetting('queryTabOrientation', command.data as string);
          break;

        case 'clientEvent/showQueryHelp':
          onShowQueryHelp();
          break;

        case 'clientEvent/openExternalUrl':
          const url = command.data as string;
          if (url) {
            window.openBrowserLink(url);
          }
          break;

        // overall commands
        case 'clientEvent/import':
          try {
            window.toggleElectronMenu(false, allMenuKeys);
            await onImport(command.data as string);
          } catch (err) {}

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

        case 'clientEvent/connection/delete':
          if (command.data) {
            onDeleteConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;
        case 'clientEvent/connection/refresh':
          if (command.data) {
            onRefreshConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;
        case 'clientEvent/connection/duplicate':
          if (command.data) {
            onDuplicateConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;
        case 'clientEvent/connection/export':
          if (command.data) {
            onExportConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;
        case 'clientEvent/connection/select':
          if (command.data) {
            onSelectConnection(command.data as SqluiCore.ConnectionProps);
          }
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

        case 'clientEvent/query/changeActiveQuery':
          if (command.data) {
            onUpdateActiveQuery(command.data as SqluiFrontend.PartialConnectionQuery);

            // show the toast with the label
            if (command.label) {
              await addToast({
                message: command.label,
              });
            }
          }
          break;

        case 'clientEvent/query/changeTabOrdering':
          const { from, to } = command?.data as any;
          if (from !== undefined && to !== undefined) {
            onChangeTabOrdering(from, to);
          }
          break;

        case 'clientEvent/query/showNext':
        case 'clientEvent/query/showPrev':
          onShowQueryWithDirection(command.event === 'clientEvent/query/showNext' ? 1 : -1);
          break;

        case 'clientEvent/query/rename':
          if (command.data) {
            onRenameQuery(command.data as SqluiFrontend.ConnectionQuery);
          } else if (activeQuery) {
            onRenameQuery(activeQuery as SqluiFrontend.ConnectionQuery);
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

        case 'clientEvent/query/reveal':
          // this reveal the current query connection
          if (activeQuery) {
            onRevealQueryConnection(activeQuery);
          }
          break;

        // session commands
        case 'clientEvent/session/switch':
          try {
            window.toggleElectronMenu(false, allMenuKeys);
            await onChangeSession();
          } catch (err) {}

          //@ts-ignore
          window.toggleElectronMenu(true, allMenuKeys);
          break;

        case 'clientEvent/session/new':
          try {
            window.toggleElectronMenu(false, allMenuKeys);
            await onAddSession();
          } catch (err) {}

          //@ts-ignore
          window.toggleElectronMenu(true, allMenuKeys);
          break;

        case 'clientEvent/session/rename':
          try {
            window.toggleElectronMenu(false, allMenuKeys);
            await onRenameSession();
          } catch (err) {}

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
    const onKeyboardShortcutEventForAll = (e: KeyboardEvent) => {
      const hasModifierKey = e.altKey || e.ctrlKey || e.metaKey;
      const { key } = e;

      // here are keybindings that are used for both the electron and web mocked
      if (hasModifierKey) {
        // with modifier key
        switch (key) {
          case 'Enter':
            try {
              (
                document.querySelector(
                  '.AdvancedEditorContainer  .inputarea.monaco-mouse-cursor-text,.SimpleEditorContainer',
                ) as HTMLTextAreaElement
              ).blur();
              setTimeout(() =>
                (document.querySelector('#btnExecuteCommand') as HTMLButtonElement).click(),
              );
              e.stopPropagation();
              e.preventDefault();
            } catch (err) {}
            break;
        }
      }
    };
    // this section below is strictly for mocked webserver
    const onKeyboardShortcutEventForMockedServer = (e: KeyboardEvent) => {
      const hasModifierKey = e.altKey || e.ctrlKey || e.metaKey;

      let onShowCommandPalette = false;
      let preventDefault = false;
      let command: Command | undefined;
      const { key } = e;

      if (hasModifierKey) {
        // with modifier key
        switch (key) {
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
          case '{':
            command = {
              event: 'clientEvent/query/showPrev',
            };
            break;
          case '}':
            command = {
              event: 'clientEvent/query/showNext',
            };
            break;
        }
      } else {
        // no modifier key
        switch (key) {
          case 'F2':
            command = {
              event: 'clientEvent/query/rename',
            };
            break;
        }
      }

      if (command) {
        e.stopPropagation();
        e.preventDefault();
      }

      if (command) {
        selectCommand(command);
      }
    };

    document.addEventListener('keydown', onKeyboardShortcutEventForAll, true);
    !window.isElectron &&
      document.addEventListener('keydown', onKeyboardShortcutEventForMockedServer, true);
    return () => {
      document.removeEventListener('keydown', onKeyboardShortcutEventForAll);
      !window.isElectron &&
        document.removeEventListener('keydown', onKeyboardShortcutEventForMockedServer);
    };
  }, []);

  return null;
}