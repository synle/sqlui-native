import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import React, { useCallback, useEffect, useState } from "react";
import { queryKeys } from "src/frontend/hooks/queryKeys";
import { getCodeSnippet, isDialectSupportManagedMetadata } from "src/common/adapters/DataScriptFactory";
import { AddBookmarkConnectionContent, AddBookmarkQueryContent } from "src/frontend/components/AddBookmarkModal";
import CodeEditorBox from "src/frontend/components/CodeEditorBox";
import CommandPalette from "src/frontend/components/CommandPalette";
import ImportModal, { ImportMode } from "src/frontend/components/ImportModal";
import ConnectionHelper from "src/frontend/components/ConnectionHelper";
import SchemaSearchModal from "src/frontend/components/SchemaSearchModal";
import SessionSelectionForm from "src/frontend/components/SessionSelectionForm";
import Settings, { ChangeSoftDeleteInput } from "src/frontend/components/Settings";
import { downloadText } from "src/frontend/data/file";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import {
  useDeleteConnection,
  useDuplicateConnection,
  useGetConnectionById,
  useGetConnections,
  useImportConnection,
  useRetryConnection,
} from "src/frontend/hooks/useConnection";
import { useActiveConnectionQuery, useConnectionQueries } from "src/frontend/hooks/useConnectionQuery";
import { useGetBookmarkItems, useImportBookmarkItem } from "src/frontend/hooks/useFolderItems";
import { useGetServerConfigs } from "src/frontend/hooks/useServerConfigs";
import {
  useCloneSession,
  useDeleteSession,
  useGetCurrentSession,
  useGetSessions,
  useSelectSession,
  useUpsertSession,
} from "src/frontend/hooks/useSession";
import { useSetting } from "src/frontend/hooks/useSetting";
import { useShowHide } from "src/frontend/hooks/useShowHide";
import useToaster from "src/frontend/hooks/useToaster";
import { platform as appPlatform } from "src/frontend/platform";
import {
  createSystemNotification,
  formatShortDate,
  getExportedBookmark,
  getExportedConnection,
  getExportedQuery,
  useNavigate,
} from "src/frontend/utils/commonUtils";
import ProxyApi from "src/frontend/data/api";
import { execute } from "src/frontend/utils/executeUtils";
import { detectAndParseImportFile, exportAsPostmanCollection } from "src/frontend/utils/importExportUtils";
import { RecordDetailsPage } from "src/frontend/views/RecordPage";
import appPackage from "src/package.json";
import { SqluiCore, SqluiEnums, SqluiFrontend } from "typings";

/** Represents a command dispatched through the MissionControl system. */
export type Command = {
  /** The client event key identifying the command type. */
  event: SqluiEnums.ClientEventKey;
  /** Optional payload data for the command. */
  data?: unknown;
  /** Optional human-readable label describing the command action. */
  label?: string;
};

/** React Query cache key for the command palette state. */
const QUERY_KEY_COMMAND_PALETTE = "commandPalette";

let _commands: Command[] = [];
let _refreshingConnectionIds: Set<string> = new Set();

/**
 * Hook for managing the command queue used by MissionControl.
 * Provides the current command, a method to dispatch new commands, and a method to dismiss them.
 * @returns An object with command, selectCommand, and dismissCommand.
 */
/** Returns whether a connection is currently being refreshed. */
export function isConnectionRefreshing(connectionId?: string): boolean {
  return connectionId ? _refreshingConnectionIds.has(connectionId) : false;
}

export function useCommands() {
  const queryClient = useQueryClient();
  const { data: commands = [] } = useQuery({ queryKey: [QUERY_KEY_COMMAND_PALETTE], queryFn: () => _commands });
  const command = commands[commands.length - 1];

  const selectCommand = (newCommand: Command) => {
    _commands = [..._commands, newCommand];

    // Defer the update to the next tick to avoid the "unmounted" warning
    setTimeout(() => queryClient.setQueryData([QUERY_KEY_COMMAND_PALETTE], _commands), 0);
  };

  const dismissCommand = () => {
    if (_commands.length > 0) {
      _commands.pop();
      _commands = [..._commands];

      // Defer the update to the next tick to avoid the "unmounted" warning
      setTimeout(() => queryClient.setQueryData([QUERY_KEY_COMMAND_PALETTE], _commands), 0);
    }
  };

  return {
    command,
    selectCommand,
    dismissCommand,
  };
}

/**
 * All Electron menu keys that should be disabled during modal dialogs.
 * Prevents confusing background actions when the query tab is not visible.
 */
export const allMenuKeys = [
  "menu-connection-new",
  "menu-import",
  "menu-export",
  "menu-query-new",
  "menu-query-rename",
  "menu-query-help",
  "menu-query-prev",
  "menu-query-next",
  "menu-query-close",
  "menu-session-new",
  "menu-session-rename",
  "menu-session-switch",
  "menu-session-delete",
];

/**
 * The central command dispatcher component for the application.
 * Listens for commands from the command queue and executes corresponding actions
 * such as navigation, connection management, query operations, session handling,
 * import/export, and keyboard shortcuts. Renders nothing (returns null).
 * @returns null
 */
export default function MissionControl() {
  const navigate = useNavigate();
  const connectionQueries = useConnectionQueries();
  const { queries } = connectionQueries;
  const { query: activeQuery, onChange: onChangeActiveQuery } = useActiveConnectionQuery();
  const { command, selectCommand, dismissCommand } = useCommands();
  const { modal, confirm, prompt, alert, choice, dismiss: dismissDialog } = useActionDialogs();
  const queryClient = useQueryClient();
  const { data: sessions } = useGetSessions();
  const { data: serverConfigs } = useGetServerConfigs();
  const { data: currentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { mutateAsync: cloneSession } = useCloneSession();
  const { mutateAsync: selectSession } = useSelectSession();
  const { mutateAsync: importConnection } = useImportConnection();
  const { data: connections } = useGetConnections();
  const { settings, onChange: onChangeSettings } = useSetting();
  const { onClear: onClearConnectionVisibles, onToggle: onToggleConnectionVisible, onSet: onSetConnectionVisible } = useShowHide();
  const { data: activeConnection } = useGetConnectionById(activeQuery?.connectionId);
  const { add: addToast } = useToaster();
  const { mutateAsync: deleteConnection } = useDeleteConnection();
  const { mutateAsync: reconnectConnection } = useRetryConnection();
  const { mutateAsync: duplicateConnection } = useDuplicateConnection();
  const { mutateAsync: deleteSession } = useDeleteSession();
  const { data: bookmarkItems } = useGetBookmarkItems();
  const { mutateAsync: importBookmarkItem } = useImportBookmarkItem();
  const [refreshingConnectionIds, setRefreshingConnectionIds] = useState<Set<string>>(new Set());
  _refreshingConnectionIds = refreshingConnectionIds;

  const onCloseQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      const _onSubmit = async () => {
        const onUndoConnection = async () => {
          curToast?.dismiss();
          await connectionQueries.onAddQuery({ ...query });
        };

        const curToast = await addToast({
          message: <>Query "{query.name}" closed.</>,
          action: (
            <>
              <Button size="small" onClick={onUndoConnection}>
                UNDO
              </Button>
            </>
          ),
        });

        await connectionQueries.onDeleteQueries([query.id]);
      };

      await modal({
        title: "Confirmation?",
        message: (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              _onSubmit();
              dismissDialog();
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>Do you want to delete this query "{query.name}"?</Box>
              <ChangeSoftDeleteInput />
              <Box sx={{ mt: 2, ml: "auto", display: "flex", gap: 3 }}>
                <Button size="small" onClick={dismissDialog}>
                  No
                </Button>
                <Button type="submit" variant="contained" size="small" autoFocus>
                  Yes
                </Button>
              </Box>
            </Box>
          </form>
        ),
        showCloseButton: true,
        size: "xs",
      });
    } catch (err) {
      console.error("index.tsx:dismissDialog", err);
    }
  };

  const onCloseOtherQueries = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      const _onSubmit = async () => {
        const queriesToClose = queries?.filter((q) => q.id !== query.id) || [];

        const onUndoQueries = async () => {
          curToast?.dismiss();
          await connectionQueries.onAddQueries(queriesToClose);
        };

        const curToast = await addToast({
          message: <>Multiple queries closed.</>,
          action: (
            <>
              <Button size="small" onClick={onUndoQueries}>
                UNDO
              </Button>
            </>
          ),
        });

        await connectionQueries.onDeleteQueries(queriesToClose?.map((q) => q.id));
      };

      await modal({
        title: "Confirmation?",
        message: (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              _onSubmit();
              dismissDialog();
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>Do you want to close other queries except "{query.name}"?</Box>
              <ChangeSoftDeleteInput />
              <Box sx={{ mt: 2, ml: "auto", display: "flex", gap: 3 }}>
                <Button size="small" onClick={dismissDialog}>
                  No
                </Button>
                <Button type="submit" variant="contained" size="small" autoFocus>
                  Yes
                </Button>
              </Box>
            </Box>
          </form>
        ),
        showCloseButton: true,
        size: "xs",
      });

      await _onSubmit();
    } catch (err) {
      console.error("index.tsx:_onSubmit", err);
    }
  };

  const onCloseQueriesToTheRight = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      const _onSubmit = async () => {
        if (!queries || queries.length <= 1) {
          return;
        }

        // find the target idx
        let targetIdx: number = -1;
        for (let i = 0; i < queries.length; i++) {
          if (queries[i].id === query.id) {
            targetIdx = i;
            break;
          }
        }

        if (targetIdx >= 0) {
          const queriesToClose = queries.filter((_q, idx) => idx > targetIdx);

          const onUndoQueries = async () => {
            curToast?.dismiss();
            await connectionQueries.onAddQueries(queriesToClose);
          };

          const curToast = await addToast({
            message: <>Multiple queries closed.</>,
            action: (
              <>
                <Button size="small" onClick={onUndoQueries}>
                  UNDO
                </Button>
              </>
            ),
          });

          await connectionQueries.onDeleteQueries(queriesToClose.map((q) => q.id));
          await connectionQueries.onShowQuery(query.id);
        }
      };

      await modal({
        title: "Confirmation?",
        message: (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              _onSubmit();
              dismissDialog();
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>Do you want to close all the queries to the right of "{query.name}"?</Box>
              <ChangeSoftDeleteInput />
              <Box sx={{ mt: 2, ml: "auto", display: "flex", gap: 3 }}>
                <Button size="small" onClick={dismissDialog}>
                  No
                </Button>
                <Button type="submit" variant="contained" size="small" autoFocus>
                  Yes
                </Button>
              </Box>
            </Box>
          </form>
        ),
        showCloseButton: true,
        size: "xs",
      });

      await _onSubmit();
    } catch (err) {
      console.error("index.tsx:_onSubmit", err);
    }
  };

  const onRenameQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    try {
      const newName = await prompt({
        title: "Rename Query",
        message: "New Query Name",
        value: query.name,
        saveLabel: "Save",
      });
      await connectionQueries.onChangeQuery(query.id, {
        name: newName,
      });
    } catch (err) {
      console.error("index.tsx:onChangeQuery", err);
    }
  };

  const onDuplicateQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    await addToast({
      message: `Duplicating "${query.name}", please wait...`,
    });
    await connectionQueries.onDuplicateQuery(query.id);
  };

  const onExportQuery = async (query: SqluiFrontend.ConnectionQuery) => {
    await addToast({
      message: `Exporting Query "${query.name}", please wait...`,
    });

    downloadText(`${query.name}.query.json`, JSON.stringify([getExportedQuery(query)], null, 2), "text/json");
  };

  const onAddQueryToBookmark = async (query: SqluiFrontend.ConnectionQuery) => {
    const { selected, ...restOfQuery } = query;

    try {
      await modal({
        title: "Add query to Bookmarks",
        message: <AddBookmarkQueryContent query={restOfQuery} onDone={dismissDialog} />,
        showCloseButton: true,
        size: "sm",
      });
    } catch (_err) {
      // user dismissed dialog
    }
  };

  const onRevealQueryConnection = async (query: SqluiFrontend.ConnectionQuery, showOnlyRevealedConnection: boolean) => {
    const { connectionId, databaseId, tableId } = query;

    if (!connectionId) {
      return;
    }

    const branchesToReveal: string[] = [connectionId];

    if (databaseId && connectionId) {
      branchesToReveal.push([connectionId, databaseId].join(" > "));

      if (tableId) {
        branchesToReveal.push([connectionId, databaseId, tableId].join(" > "));
      }
    }

    if (showOnlyRevealedConnection === true) {
      // hide everything else, only reveal this set of connection
      const newVisibles = {};
      for (const branchToReveal of branchesToReveal) {
        // reveal
        newVisibles[branchToReveal] = true;
      }

      onSetConnectionVisible(newVisibles);
    } else {
      for (const branchToReveal of branchesToReveal) {
        // reveal
        onToggleConnectionVisible(branchToReveal, true);
      }
    }

    // scroll to the revealed element
    setTimeout(() => {
      const selectedHeaders = document.querySelectorAll(
        ".Accordion__Header.selected, .ConnectionDescription.selected, .DatabaseDescription.selected, .TableDescription.selected",
      );
      const target = selectedHeaders[selectedHeaders.length - 1];
      if (target) {
        target.scrollIntoView({ block: "center" });
      }
    }, 100);
  };

  const onApplyQuery = async (data: SqluiFrontend.PartialConnectionQuery, openQueryInNewTab: boolean, toastMessage: string | undefined) => {
    if (openQueryInNewTab === true) {
      const parts: string[] = [];
      const conn = data.connectionId ? connections?.find((c) => c.id === data.connectionId) : undefined;
      if (conn?.name) parts.push(conn.name);
      if (data.databaseId) parts.push(data.databaseId);
      if (data.tableId) parts.push((data as any).tableName ?? data.tableId);

      const prefix = parts.length > 0 ? `${parts.join(" / ")}` : "";
      const isManagedTable = isDialectSupportManagedMetadata(conn?.dialect) && data.tableId;
      const newQueryTabName = isManagedTable ? prefix : `${prefix} Query ${formatShortDate()}`;

      await connectionQueries.onAddQuery({
        ...data,
        name: newQueryTabName,
      });
    } else {
      onChangeActiveQuery(data);
    }

    if (toastMessage) {
      await addToast({
        message: toastMessage,
      });
    }
  };

  const onPinQuery = async (query: SqluiFrontend.ConnectionQuery, pinned: boolean) => {
    await connectionQueries.onChangeQuery(query.id, {
      pinned,
    });

    await addToast({
      message: `Query "${query.name}" ${pinned ? "pinned" : "unpinned"}`,
    });
  };

  const onShowQueryHelp = async () => {
    let data: string;

    if (activeConnection && activeConnection.dialect) {
      // open query help with selected dialect
      data = `https://synle.github.io/sqlui-native/guides#${activeConnection.dialect}`;
    } else {
      data = `https://synle.github.io/sqlui-native/guides`;
    }

    selectCommand({ event: "clientEvent/openExternalUrl", data });
  };

  const onShowQueryWithDirection = async (direction: number) => {
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
      await connectionQueries.onShowQuery(queries[targetIdx].id);
    }
  };

  const onChangeSession = async () => {
    if (!sessions) {
      return;
    }

    try {
      await modal({
        title: "Change Session",
        message: <SessionSelectionForm isFirstTime={false} />,
        size: "sm",
      });
    } catch (err) {
      console.error("index.tsx:modal", err);
    }
  };

  const onAddSession = async (onClose?: () => void) => {
    try {
      // create the new session
      // if there is no session, let's create the session
      const newSessionName = await prompt({
        title: "New Session",
        message: "New Session Name",
        value: `Session ${new Date().toLocaleString()}`,
        saveLabel: "Save",
        required: true,
      });

      if (!newSessionName) {
        return;
      }

      const newSession = await upsertSession({
        name: newSessionName,
      } as any);

      if (!newSession) {
        return;
      }

      selectSession(newSession.id);
    } catch (err) {
      console.error("index.tsx:selectSession", err);
      if (onClose) {
        onClose();
      }
    }
  };

  const onCloneSession = async (targetSession: SqluiCore.Session) => {
    try {
      // create the new session
      // if there is no session, let's create the session
      const newSessionName = await prompt({
        title: "Clone Session",
        message: "New Session Name",
        value: `Cloned Session ${new Date().toLocaleString()}`,
        saveLabel: "Save",
        required: true,
      });

      if (!newSessionName) {
        return;
      }

      const newSession = await cloneSession({
        id: targetSession.id,
        name: newSessionName,
      });

      if (!newSession) {
        return;
      }

      selectSession(newSession.id);
    } catch (err) {
      console.error("index.tsx:selectSession", err);
    }
  };

  const onRenameSession = async (targetSession: SqluiCore.Session) => {
    try {
      if (!targetSession) {
        return;
      }

      const newSessionName = await prompt({
        title: "Rename Session",
        message: "New Session Session",
        value: targetSession.name,
        saveLabel: "Save",
      });

      if (!newSessionName) {
        return;
      }

      await upsertSession({
        ...targetSession,
        name: newSessionName,
      });
    } catch (err) {
      console.error("index.tsx:upsertSession", err);
    }
  };

  const onDeleteSession = async (targetSession: SqluiCore.Session) => {
    try {
      if (!targetSession) {
        return;
      }

      await confirm(`Do you want to delete this session "${targetSession.name}"?`);
      await deleteSession(targetSession.id);

      if (targetSession.id === currentSession?.id) {
        navigate("/session_expired", { replace: true });
      }
    } catch (err) {
      console.error("index.tsx:onDeleteSession", err);
    }
  };

  const onExportAll = async () => {
    await addToast({
      message: `Exporting All Connections, Queries, and Bookmarks, please wait...`,
    });

    const jsonContent: any[] = [];

    if (connections) {
      for (const connection of connections) {
        let managedMetadata: { databases: SqluiCore.ManagedDatabase[]; tables: SqluiCore.ManagedTable[] } | undefined;
        const isRestApi = connection.dialect === "rest";
        if (isRestApi) {
          try {
            const [databases, tables] = await Promise.all([
              ProxyApi.listManagedDatabases(connection.id),
              ProxyApi.listManagedTables(connection.id),
            ]);
            if (databases.length > 0 || tables.length > 0) {
              managedMetadata = { databases, tables };
            }
          } catch (err) {
            console.error("MissionControl:onExportAll:managedMetadata", err);
          }
        }
        jsonContent.push(getExportedConnection(connection, managedMetadata));
      }
    }

    if (queries) {
      for (const query of queries) {
        jsonContent.push(getExportedQuery(query));
      }
    }

    if (bookmarkItems) {
      for (const bookmark of bookmarkItems) {
        jsonContent.push(getExportedBookmark(bookmark));
      }
    }

    downloadText(`${new Date().toLocaleString()}.sqlui_native.json`, JSON.stringify(jsonContent, null, 2), "text/json");
  };

  const onNewConnection = useCallback(() => navigate("/connection/new"), []);

  const onDeleteConnection = async (connection: SqluiCore.ConnectionProps) => {
    let curToast;
    try {
      const _onSubmit = async () => {
        try {
          await deleteConnection(connection.id);

          const onUndoConnection = async () => {
            curToast?.dismiss();
            await duplicateConnection(connection);
          };

          curToast = await addToast({
            message: <>Connection "{connection.name}" deleted.</>,
            action: (
              <>
                <Button size="small" onClick={onUndoConnection}>
                  UNDO
                </Button>
              </>
            ),
          });

          createSystemNotification(`Connection "${connection.name}" (dialect=${connection.dialect || "N/A"}) deleted`);
        } catch (err1) {
          console.error("MissionControl:deleteConnection", err1);
          curToast = await addToast({
            message: `Failed to delete connection "${connection.name}" (dialect=${connection.dialect || "N/A"})`,
          });
        }
      };

      await modal({
        title: "Confirmation?",
        message: (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              _onSubmit();
              dismissDialog();
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>Delete this connection {connection.name}?</Box>
              <ChangeSoftDeleteInput />
              <Box sx={{ mt: 2, ml: "auto", display: "flex", gap: 3 }}>
                <Button size="small" onClick={dismissDialog}>
                  No
                </Button>
                <Button type="submit" variant="contained" size="small" autoFocus>
                  Yes
                </Button>
              </Box>
            </Box>
          </form>
        ),
        showCloseButton: true,
        size: "xs",
      });
    } catch (err) {
      console.error("index.tsx:dismissDialog", err);
    }
  };

  const onShowBookmarks = () => {
    navigate("/bookmarks");
  };

  const onAddConnectionToBookmark = async (connection: SqluiCore.ConnectionProps) => {
    const { status, ...restOfConnectionMetaData } = connection;

    try {
      await modal({
        title: "Add connection to Bookmarks",
        message: <AddBookmarkConnectionContent connection={restOfConnectionMetaData} onDone={dismissDialog} />,
        showCloseButton: true,
        size: "sm",
      });
    } catch (_err) {
      // user dismissed dialog
    }
  };

  const onRefreshConnection = async (connection: SqluiCore.ConnectionProps) => {
    if (!connection.id || refreshingConnectionIds.has(connection.id)) return;

    setRefreshingConnectionIds((prev) => new Set(prev).add(connection.id!));

    let curToast;
    curToast = await addToast({
      message: `Refreshing connection "${connection.name}", please wait...`,
    });

    let resultMessage = "";
    try {
      await reconnectConnection(connection.id);
      resultMessage = `Successfully connected to "${connection.name}" (dialect=${connection.dialect || "N/A"})`;
    } catch (err) {
      console.error("index.tsx:reconnectConnection", err);
      resultMessage = `Failed to connect to "${connection.name}"`;
    }

    setRefreshingConnectionIds((prev) => {
      const next = new Set(prev);
      next.delete(connection.id!);
      return next;
    });

    await curToast.dismiss();
    curToast = await addToast({
      message: resultMessage,
    });

    createSystemNotification(resultMessage);
  };

  const onRefreshAllConnections = async () => {
    if (!connections || connections.length === 0) return;
    const nonManagedConnections = connections.filter(
      (c) => !isDialectSupportManagedMetadata(c.dialect),
    );
    await Promise.allSettled(nonManagedConnections.map((c) => onRefreshConnection(c)));
  };

  const onDuplicateConnection = async (connection: SqluiCore.ConnectionProps) => {
    await addToast({
      message: `Duplicating connection "${connection.name}", please wait...`,
    });

    duplicateConnection(connection);
  };

  const onExportConnection = async (connection: SqluiCore.ConnectionProps) => {
    await addToast({
      message: `Exporting connection "${connection.name}", please wait...`,
    });

    let managedMetadata: { databases: SqluiCore.ManagedDatabase[]; tables: SqluiCore.ManagedTable[] } | undefined;
    const isRestApi = connection.dialect === "rest";
    if (isRestApi) {
      try {
        const [databases, tables] = await Promise.all([
          ProxyApi.listManagedDatabases(connection.id),
          ProxyApi.listManagedTables(connection.id),
        ]);
        if (databases.length > 0 || tables.length > 0) {
          managedMetadata = { databases, tables };
        }
      } catch (err) {
        console.error("MissionControl:onExportConnection:managedMetadata", err);
      }
    }

    downloadText(
      `${connection.name}.connection.json`,
      JSON.stringify([getExportedConnection(connection, managedMetadata)], null, 2),
      "text/json",
    );
  };

  /** Opens a file picker, auto-detects HAR/Postman format, confirms, and imports into the connection. */
  const onImportCollection = async (connection: SqluiCore.ConnectionProps) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.har";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      let result;
      try {
        const text = await file.text();
        result = detectAndParseImportFile(text);
      } catch (err) {
        console.error("MissionControl:onImportCollection:parse", err);
        return alert(`Import failed: ${err instanceof Error ? err.message : "Invalid file"}`);
      }

      if (result.requests.length === 0) {
        return alert("No requests found in the imported file.");
      }

      try {
        const confirmed = await choice(`Import ${result.format === "har" ? "HAR" : "Postman"} Collection`, result.summary, [
          { label: "Import", value: "Import" },
          { label: "Cancel", value: "Cancel" },
        ]);
        if (confirmed !== "Import") return;
      } catch (_err) {
        // user dismissed dialog
        return;
      }

      const curToast = await addToast({
        message: `Importing ${result.requests.length} request${result.requests.length !== 1 ? "s" : ""}, please wait...`,
      });

      try {
        const connectionId = connection.id;

        // Create folders
        for (const folder of result.folders) {
          try {
            await ProxyApi.createManagedDatabase(connectionId, { name: folder.name });
            if (folder.variables && folder.variables.length > 0) {
              await ProxyApi.updateManagedDatabase(connectionId, folder.name, {
                props: { variables: folder.variables },
              });
            }
          } catch (_err) {
            // folder may already exist, continue
          }
        }

        // Create requests
        for (const req of result.requests) {
          try {
            const created = await ProxyApi.createManagedTable(connectionId, req.folderName, { name: req.name });
            await ProxyApi.updateManagedTable(connectionId, req.folderName, created.id, { props: { query: req.curl } });
          } catch (err) {
            console.error("MissionControl:onImportCollection:createRequest", err);
          }
        }

        // Merge collection-level variables into connection if provided
        if (result.variables && result.variables.length > 0) {
          try {
            const conn = await ProxyApi.getConnection(connectionId);
            const config = JSON.parse(conn.connection.replace(/^(rest|restapi):\/\//, ""));
            const existingVars: { key: string; value: string; enabled: boolean }[] = config.variables || [];
            const existingKeys = new Set(existingVars.map((v) => v.key));
            const newVars = result.variables.filter((v) => !existingKeys.has(v.key));
            if (newVars.length > 0) {
              config.variables = [...existingVars, ...newVars];
              await ProxyApi.upsertConnection({ ...conn, connection: `rest://${JSON.stringify(config)}` });
            }
          } catch (err) {
            console.error("MissionControl:onImportCollection:mergeVariables", err);
          }
        }

        queryClient.invalidateQueries({ queryKey: queryKeys.connections.byId(connectionId) });

        await curToast.dismiss();
        await addToast({
          message: `Successfully imported ${result.requests.length} request${result.requests.length !== 1 ? "s" : ""} from ${result.format === "har" ? "HAR" : "Postman"} file.`,
        });
      } catch (err) {
        console.error("MissionControl:onImportCollection", err);
        await curToast.dismiss();
        alert("Import failed. Check the console for details.");
      }
    };

    input.click();
  };

  /** Exports REST API folders and requests as a Postman Collection v2.1 JSON. */
  const onExportAsPostman = async (connection: SqluiCore.ConnectionProps) => {
    const curToast = await addToast({
      message: `Exporting "${connection.name}" as Postman collection, please wait...`,
    });

    try {
      const [databases, tables] = await Promise.all([
        ProxyApi.listManagedDatabases(connection.id),
        ProxyApi.listManagedTables(connection.id),
      ]);

      // Parse connection-level variables
      let connectionVars: { key: string; value: string; enabled: boolean }[] = [];
      try {
        const config = JSON.parse(connection.connection.replace(/^(rest|restapi):\/\//, ""));
        connectionVars = config.variables || [];
        if (config.HOST) {
          connectionVars = [{ key: "HOST", value: config.HOST, enabled: true }, ...connectionVars];
        }
      } catch (_err) {
        // ignore parse error
      }

      const folders = databases.map((db) => ({
        name: db.name,
        variables: (db.props as any)?.variables,
      }));

      // Fetch full table data (with props.query) for each table
      const requests: { name: string; folderName: string; curl: string }[] = [];
      for (const table of tables) {
        try {
          const fullTable = await ProxyApi.getManagedTable(connection.id, table.databaseId, table.id);
          const query = (fullTable.props as any)?.query || "";
          if (query) {
            requests.push({
              name: table.name,
              folderName: table.databaseId,
              curl: query,
            });
          }
        } catch (err) {
          console.error("MissionControl:onExportAsPostman:getTable", err);
        }
      }

      const json = exportAsPostmanCollection({
        connectionName: connection.name,
        folders,
        requests,
        variables: connectionVars,
      });

      downloadText(`${connection.name}.postman_collection.json`, json, "text/json");

      await curToast.dismiss();
      await addToast({
        message: `Exported "${connection.name}" as Postman collection (${requests.length} request${requests.length !== 1 ? "s" : ""}).`,
      });
    } catch (err) {
      console.error("MissionControl:onExportAsPostman", err);
      await curToast.dismiss();
      alert("Export failed. Check the console for details.");
    }
  };

  const onSelectConnection = async (connection: SqluiCore.ConnectionProps) => {
    selectCommand({
      event: "clientEvent/query/apply/active",
      data: {
        connectionId: connection.id,
        databaseId: "",
      },
    });
  };

  /** Processes the raw JSON import data with the selected import mode. */
  const _processImport = async (rawJson: string, mode: ImportMode) => {
    dismissDialog();

    let jsonRows: any[];
    try {
      jsonRows = JSON.parse(rawJson || "");
    } catch (err) {
      console.error("MissionControl:_processImport:parse", err);
      return alert(`Import failed. Invalid JSON config`);
    }

    const curToast = await addToast({
      message: "Importing, please wait...",
    });

    // import order: connections first, then queries, then bookmarks
    const importOrder: Record<string, number> = { connection: 0, query: 1, bookmark: 2 };
    jsonRows = jsonRows.sort((a, b) => {
      return (importOrder[a._type] ?? 99) - (importOrder[b._type] ?? 99);
    });

    // strip IDs if mode is "stripIds" so imports create new entries
    if (mode === "stripIds") {
      jsonRows = jsonRows.map(({ id, connectionId, ...rest }) => rest);
    }

    // check for duplicate id (only relevant when keeping IDs)
    if (mode === "keepIds") {
      const hasDuplicateIds = new Set([...jsonRows.map((jsonRow) => jsonRow.id)]).size !== jsonRows.length;
      if (hasDuplicateIds) {
        return alert(`Import failed. JSON Config includes duplicate IDs.`);
      }
    }

    let failedCount = 0,
      successCount = 0;
    for (const jsonRow of jsonRows) {
      try {
        const { _type, managedMetadata, ...rawImportMetaData } = jsonRow;
        switch (_type) {
          case "connection": {
            // upsert: updates existing connection if ID matches, otherwise creates new
            const imported = await importConnection(rawImportMetaData);
            // Reconstruct managed metadata (folders/requests) — always create fresh
            if (managedMetadata && imported?.id) {
              const connId = imported.id;
              // Delete existing managed data first
              try {
                const existingDbs = await ProxyApi.listManagedDatabases(connId);
                for (const db of existingDbs) {
                  await ProxyApi.deleteManagedDatabase(connId, db.name);
                }
              } catch (_err) {
                // no existing data to clean up
              }
              // Create folders and requests from the import
              for (const db of managedMetadata.databases || []) {
                await ProxyApi.createManagedDatabase(connId, { name: db.name });
                if (db.props && Object.keys(db.props).length > 0) {
                  await ProxyApi.updateManagedDatabase(connId, db.name, { props: db.props });
                }
              }
              for (const table of managedMetadata.tables || []) {
                const created = await ProxyApi.createManagedTable(connId, table.databaseId, { name: table.name });
                if (table.props && Object.keys(table.props).length > 0) {
                  await ProxyApi.updateManagedTable(connId, table.databaseId, created.id, { props: table.props });
                }
              }
            }
            break;
          }

          case "query":
            await connectionQueries.onImportQuery(jsonRow);
            break;

          case "bookmark":
            // upsert: updates existing bookmark if ID matches, otherwise creates new
            await importBookmarkItem(rawImportMetaData as SqluiCore.FolderItem);
            break;
        }
        successCount++;
      } catch (err) {
        console.error("MissionControl:_processImport", jsonRow, err);
        failedCount++;
      }
    }

    await curToast.dismiss();
    alert(`Import finished with ${successCount} successes and ${failedCount} failures`);
  };

  const onImport = async (value = "") => {
    try {
      await modal({
        title: "Import Connections / Queries / Bookmarks",
        message: <ImportModal initialValue={value} onImport={_processImport} />,
        showCloseButton: true,
        isFullScreen: true,
        disableBackdropClick: true,
      });
    } catch (_err) {
      // user dismissed dialog
    }
  };

  const onShowCommandPalette = async () => {
    try {
      const onSelectCommand = (command: Command) => {
        dismissDialog();
        _executeCommandPalette(command);
      };
      await modal({
        title: "Command Palette",
        message: <CommandPalette onSelectCommand={onSelectCommand} />,
        size: "sm",
      });
    } catch (err) {
      console.error("index.tsx:modal", err);
    }
  };

  const onShowRecordDetails = async (data: any, isEditMode: boolean) => {
    try {
      await modal({
        title: "Record Details",
        message: <RecordDetailsPage data={data} isEditMode={isEditMode} />,
        showCloseButton: true,
      });
    } catch (err) {
      console.error("index.tsx:modal", err);
    }
  };

  const onCheckForUpdate = async () => {
    const newVersion = await fetch("https://api.github.com/repos/synle/sqlui-native/releases/latest")
      .then((r) => r.json())
      .then((r) => r.tag_name);

    const isUpToDate = newVersion === appPackage.version;
    const versionForUrl = newVersion.replace(/^v/, "");
    const baseDownloadUrl = `https://github.com/synle/sqlui-native/releases/download/${newVersion}/sqlui-native`;
    const releasePageUrl = `https://github.com/synle/sqlui-native/releases/tag/${newVersion}`;

    /** Returns platform-specific download links with the recommended one first based on OS and architecture. */
    const getDownloadLinks = (): { label: string; url: string; recommended: boolean }[] => {
      const platform = window?.process?.platform;
      const arch = window?.process?.arch || "";

      if (platform === "darwin") {
        const isArm = arch === "arm64";
        return [
          { label: "macOS (Apple Silicon)", url: `${baseDownloadUrl}-${newVersion}-arm64.dmg`, recommended: isArm },
          { label: "macOS (Intel x64)", url: `${baseDownloadUrl}-${newVersion}-x64.dmg`, recommended: !isArm },
        ];
      }

      if (platform === "win32") {
        const isArm = arch === "arm64";
        return [
          { label: "Windows (x64)", url: `${baseDownloadUrl}-${newVersion}-x64.exe`, recommended: !isArm },
          { label: "Windows (ARM64)", url: `${baseDownloadUrl}-${newVersion}-arm64.exe`, recommended: isArm },
        ];
      }

      // Linux or unknown — no architecture detection, show all
      return [
        { label: "Linux (.deb)", url: `${baseDownloadUrl}-${newVersion}.deb`, recommended: false },
        { label: "Linux (.rpm)", url: `${baseDownloadUrl}-${newVersion}.rpm`, recommended: false },
        { label: "Linux (.AppImage)", url: `${baseDownloadUrl}-${newVersion}.AppImage`, recommended: false },
      ];
    };

    const downloadLinks = getDownloadLinks();

    const contentDom = (
      <>
        <Box className="FormInput__Row">
          <strong>{isUpToDate ? "You are on the latest version." : "A new version is available."}</strong>
        </Box>
        <Box className="FormInput__Row">
          <label>Your version:</label>
          {appPackage.version}
        </Box>
        {(appPackage as any).engine && (
          <Box className="FormInput__Row">
            <label>Engine:</label>
            {(appPackage as any).engine}
          </Box>
        )}
        <Box className="FormInput__Row">
          <label>Latest version:</label>
          {newVersion}
        </Box>
        <Box className="FormInput__Row" sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <label>Download latest version:</label>
          {downloadLinks.map((link) => (
            <Link
              key={link.label}
              onClick={() => selectCommand({ event: "clientEvent/openExternalUrl", data: link.url })}
              sx={{ cursor: "pointer", fontWeight: link.recommended ? "bold" : "normal" }}
            >
              {link.label}
              {link.recommended ? " (Recommended)" : ""}
            </Link>
          ))}
          <Link onClick={() => selectCommand({ event: "clientEvent/openExternalUrl", data: releasePageUrl })} sx={{ cursor: "pointer" }}>
            All Downloads
          </Link>
        </Box>
      </>
    );

    const onGoToHomepage = () => {
      const data = "https://synle.github.io/sqlui-native/";
      selectCommand({ event: "clientEvent/openExternalUrl", data });
    };

    const onRevealDataLocation = () => {
      const platform = window?.process?.platform;
      const storageDir = serverConfigs?.storageDir || "";

      if (!storageDir) {
        return;
      }

      // copy the path to clipboard
      navigator.clipboard.writeText(storageDir);

      if (appPlatform.isDesktop) {
        if (platform === "win32") {
          execute(`explorer.exe "${storageDir}"`);
        } else if (platform === "darwin") {
          execute(`open "${storageDir}"`);
        } else {
          // anything else
        }
      }
    };

    await modal({
      title: "Check for update",
      message: (
        <Box className="FormInput__Container FormInput__Container__sm">
          {contentDom}
          <Box className="FormInput__Row">
            <label>Data Location:</label>
            <Link onClick={onRevealDataLocation}>{serverConfigs?.storageDir}</Link>
          </Box>
          <Box sx={{ mt: 3 }}>
            <Link onClick={onGoToHomepage}>synle.github.io/sqlui-native</Link>
          </Box>
        </Box>
      ),
      showCloseButton: true,
      size: "xs",
    });
  };

  const onSchemaSearch = async () => {
    try {
      const onNavigate = (connectionId: string, databaseId: string, tableId: string) => {
        dismissDialog();

        // Check if the connection still exists
        const conn = connections?.find((c) => c.id === connectionId);
        if (!conn) {
          alert("This connection no longer exists in the current session.");
          return;
        }

        // Expand the tree path: connection > database > table
        const branchesToReveal = [connectionId, [connectionId, databaseId].join(" > "), [connectionId, databaseId, tableId].join(" > ")];

        for (const branch of branchesToReveal) {
          onToggleConnectionVisible(branch, true);
        }

        // Scroll to and flash the target element after DOM updates
        setTimeout(() => {
          const targetKey = [connectionId, databaseId, tableId].join(" > ");
          const targetEl = document.querySelector(`[data-tree-key="${CSS.escape(targetKey)}"]`);
          if (targetEl) {
            targetEl.scrollIntoView({ block: "center" });
            targetEl.classList.add("schema-search-flash");
            setTimeout(() => targetEl.classList.remove("schema-search-flash"), 2000);
          }
        }, 200);
      };

      await modal({
        title: "Schema Search",
        message: <SchemaSearchModal onNavigate={onNavigate} />,
        showCloseButton: true,
        size: "md",
      });
    } catch (_err) {
      // user dismissed dialog
    }
  };

  const onShowSettings = async () => {
    await modal({
      title: "Settings",
      message: <Settings />,
      showCloseButton: true,
      size: "xs",
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

      switch (command.event as string) {
        case "clientEvent/navigate":
          navigate(command.data as string);
          break;

        case "clientEvent/openAppWindow":
          appPlatform.openAppWindow(command.data as string);
          break;
        case "clientEvent/showCommandPalette":
          onShowCommandPalette();
          break;

        case "clientEvent/checkForUpdate":
          onCheckForUpdate();
          break;

        case "clientEvent/schema/search":
          onSchemaSearch();
          break;

        case "clientEvent/showSettings":
          onShowSettings();
          break;

        case "clientEvent/toggleSidebar":
          document.dispatchEvent(new Event("toggleSidebar"));
          break;

        case "clientEvent/clearShowHides":
          onClearConnectionVisibles();
          break;

        case "clientEvent/changeDarkMode":
          onUpdateSetting("darkMode", command.data as string);
          break;

        case "clientEvent/changeEditorMode":
          onUpdateSetting("editorMode", command.data as string);
          break;

        case "clientEvent/changeLayoutMode":
          onUpdateSetting("layoutMode", command.data as string);
          break;

        case "clientEvent/changeLayoutMode/comfortable":
          onUpdateSetting("layoutMode", "comfortable");
          break;

        case "clientEvent/changeLayoutMode/compact":
          onUpdateSetting("layoutMode", "compact");
          break;

        case "clientEvent/changeAnimationMode":
          onUpdateSetting("animationMode", command.data as string);
          break;

        case "clientEvent/changeAnimationMode/system":
          onUpdateSetting("animationMode", "");
          break;

        case "clientEvent/changeAnimationMode/off":
          onUpdateSetting("animationMode", "off");
          break;

        case "clientEvent/changeAnimationMode/on":
          onUpdateSetting("animationMode", "on");
          break;

        case "clientEvent/changeEditorHeight/small":
          onUpdateSetting("editorHeight", "small");
          break;

        case "clientEvent/changeEditorHeight/medium":
          onUpdateSetting("editorHeight", "medium");
          break;

        case "clientEvent/changeEditorHeight/full":
          onUpdateSetting("editorHeight", "full");
          break;

        case "clientEvent/tableRenderer":
          onUpdateSetting("tableRenderer", command.data as string);
          break;

        case "clientEvent/changeWrapMode":
          onUpdateSetting("wordWrap", command.data as string);
          break;

        case "clientEvent/changeQueryTabOrientation":
          onUpdateSetting("queryTabOrientation", command.data as string);
          break;

        case "clientEvent/changeQuerySelectionMode":
          onUpdateSetting("querySelectionMode", command.data as string);
          break;

        case "clientEvent/showQueryHelp":
          onShowQueryHelp();
          break;

        case "clientEvent/showConnectionHelper":
          if (command.data) {
            const { scheme, username, password, host, port, restOfConnectionString, onApply } = command.data as any;

            const onApplyConnectionHelper = (newConnectionString: string) => {
              dismissDialog();
              //@ts-ignore
              onApply(newConnectionString);
            };

            modal({
              title: "Connection Helper",
              message: (
                <ConnectionHelper
                  onChange={onApplyConnectionHelper}
                  onClose={dismissDialog}
                  scheme={scheme}
                  username={username}
                  password={password}
                  host={host}
                  port={port}
                  restOfConnectionString={restOfConnectionString}
                />
              ),
              showCloseButton: true,
            });
          }
          break;

        case "clientEvent/openExternalUrl":
          const url = command.data as string;
          if (url) {
            appPlatform.openExternalUrl(url);
          }
          break;

        // overall commands
        case "clientEvent/import":
          try {
            appPlatform.toggleMenuItems(false, allMenuKeys);
            await onImport(command.data as string);
          } catch (err) {
            console.error("index.tsx:onImport", err);
          }

          //@ts-ignore
          appPlatform.toggleMenuItems(true, allMenuKeys);
          break;

        case "clientEvent/exportAll":
          onExportAll();
          break;

        // connection commands
        case "clientEvent/connection/new":
          onNewConnection();
          break;

        case "clientEvent/connection/delete":
          if (command.data) {
            onDeleteConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case "clientEvent/connection/refresh":
          if (command.data) {
            onRefreshConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case "clientEvent/connection/refreshAll":
          onRefreshAllConnections();
          break;

        case "clientEvent/connection/duplicate":
          if (command.data) {
            onDuplicateConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case "clientEvent/connection/export":
          if (command.data) {
            onExportConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case "clientEvent/connection/importCollection":
          if (command.data) {
            onImportCollection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case "clientEvent/connection/exportAsPostman":
          if (command.data) {
            onExportAsPostman(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case "clientEvent/connection/select":
          if (command.data) {
            onSelectConnection(command.data as SqluiCore.ConnectionProps);
          }
          break;

        case "clientEvent/connection/addToBookmark":
          if (command.data) {
            onAddConnectionToBookmark(command.data as SqluiCore.ConnectionProps);
          }
          break;

        // bookmark commands
        case "clientEvent/bookmark/show":
          onShowBookmarks();
          break;

        // query commands
        case "clientEvent/query/new":
          await connectionQueries.onAddQuery();
          break;

        case "clientEvent/query/show":
          if (command.data) {
            await connectionQueries.onShowQuery((command.data as SqluiFrontend.ConnectionQuery).id);
          }
          break;

        case "clientEvent/query/apply": // based on the setting use either new query or selected query
          if (command.data) {
            const querySelectionMode = settings?.querySelectionMode || "new-tab";

            onApplyQuery(command.data as SqluiFrontend.PartialConnectionQuery, querySelectionMode === "new-tab", command.label);

            navigate("/");
            document.querySelector("#QueryBoxTabs")?.scrollIntoView();
          }
          break;

        case "clientEvent/query/apply/active": // currently selected / active query only
          if (command.data) {
            onApplyQuery(
              command.data as SqluiFrontend.PartialConnectionQuery,
              false, // same-tab
              command.label,
            );
            navigate("/");
          }
          break;

        case "clientEvent/query/apply/new": // create new query and apply
          if (command.data) {
            onApplyQuery(
              command.data as SqluiFrontend.PartialConnectionQuery,
              true, // new-tab
              command.label,
            );
            navigate("/");
          }
          break;

        case "clientEvent/query/pin":
          if (command.data) {
            onPinQuery(command.data as SqluiFrontend.ConnectionQuery, true);
          }
          break;

        case "clientEvent/query/unpin":
          if (command.data) {
            onPinQuery(command.data as SqluiFrontend.ConnectionQuery, false);
          }
          break;

        case "clientEvent/query/changeTabOrdering":
          const { from, to } = command?.data as any;
          if (from !== undefined && to !== undefined) {
            await connectionQueries.onChangeTabOrdering(from, to);
          }
          break;

        case "clientEvent/query/showNext":
        case "clientEvent/query/showPrev":
          onShowQueryWithDirection(command.event === "clientEvent/query/showNext" ? 1 : -1);
          break;

        case "clientEvent/query/rename":
          if (command.data) {
            onRenameQuery(command.data as SqluiFrontend.ConnectionQuery);
          } else if (activeQuery) {
            onRenameQuery(activeQuery as SqluiFrontend.ConnectionQuery);
          }
          break;

        case "clientEvent/query/export":
          if (command.data) {
            onExportQuery(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case "clientEvent/query/duplicate":
          if (command.data) {
            onDuplicateQuery(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case "clientEvent/query/close":
          if (command.data) {
            onCloseQuery(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case "clientEvent/query/closeOther":
          if (command.data) {
            onCloseOtherQueries(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case "clientEvent/query/closeToTheRight":
          if (command.data) {
            onCloseQueriesToTheRight(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case "clientEvent/query/closeCurrentlySelected":
          // this closes the active query
          if (activeQuery) {
            onCloseQuery(activeQuery);
          }
          break;

        case "clientEvent/query/reveal":
          // this reveal the current query connection
          // but keep the old state
          if (activeQuery) {
            onRevealQueryConnection(activeQuery, false);
          }
          break;

        case "clientEvent/query/revealThisOnly":
          // this reveal ONLY the current query connection
          // and hide everything else
          if (command.data) {
            onRevealQueryConnection(command.data as SqluiFrontend.ConnectionQuery, true);
          }
          break;

        case "clientEvent/query/addToBookmark":
          // this reveal the current query connection
          if (command.data) {
            onAddQueryToBookmark(command.data as SqluiFrontend.ConnectionQuery);
          }
          break;

        case "clientEvent/query/showSampleCodeSnippet":
          if (command.data) {
            const { connection, query, language } = command.data as any;

            const codeSnippet = getCodeSnippet(connection, query, language);

            const onDownloadCodeSnippet = () => {
              let extension = "";
              switch (language) {
                case "javascript":
                  extension = "js";
                  break;

                case "python":
                  extension = "py";
                  break;

                case "java":
                  extension = "java";
                  break;
              }
              if (extension) {
                downloadText(`sample-code-snippet-${Date.now()}.${extension}`, codeSnippet, "text/plain");
              }
            };

            modal({
              title: "Sample Code Snippet",
              message: (
                <Box className="FormInput__Container">
                  <Box>
                    <strong>LanguageMode:</strong> {language}
                  </Box>
                  <CodeEditorBox value={codeSnippet} language={language} height="60vh" />
                  <Box sx={{ display: "flex", justifyContent: "end" }}>
                    <Button onClick={onDownloadCodeSnippet}>Download Code Snippet</Button>
                  </Box>
                </Box>
              ),
              showCloseButton: true,
            });
          }
          break;

        // records command
        case "clientEvent/record/showDetails":
          if (command.data) {
            onShowRecordDetails(command.data, false);
          }
          break;

        case "clientEvent/record/edit":
          if (command.data) {
            onShowRecordDetails(command.data, true);
          }
          break;

        case "clientEvent/record/new":
          navigate("/record/new");
          break;

        // session commands
        case "clientEvent/session/switch":
          try {
            appPlatform.toggleMenuItems(false, allMenuKeys);
            await onChangeSession();
          } catch (err) {
            console.error("index.tsx:onChangeSession", err);
          }

          appPlatform.toggleMenuItems(true, allMenuKeys);
          break;

        case "clientEvent/session/new":
          try {
            appPlatform.toggleMenuItems(false, allMenuKeys);
            await onAddSession();
          } catch (err) {
            console.error("index.tsx:onAddSession", err);
          }

          appPlatform.toggleMenuItems(true, allMenuKeys);
          break;

        case "clientEvent/session/clone":
          try {
            appPlatform.toggleMenuItems(false, allMenuKeys);

            if (command.data) {
              await onCloneSession(command.data as SqluiCore.Session);
            } else if (currentSession) {
              await onCloneSession(currentSession as SqluiCore.Session);
            }
          } catch (err) {
            console.error("index.tsx:onCloneSession", err);
          }

          appPlatform.toggleMenuItems(true, allMenuKeys);
          break;

        case "clientEvent/session/rename":
          try {
            appPlatform.toggleMenuItems(false, allMenuKeys);

            if (command.data) {
              await onRenameSession(command.data as SqluiCore.Session);
            } else if (currentSession) {
              await onRenameSession(currentSession as SqluiCore.Session);
            }
          } catch (err) {
            console.error("index.tsx:onRenameSession", err);
          }

          appPlatform.toggleMenuItems(true, allMenuKeys);
          break;

        case "clientEvent/session/delete":
          try {
            appPlatform.toggleMenuItems(false, allMenuKeys);
            if (command.data) {
              await onDeleteSession(command.data as SqluiCore.Session);
            } else if (currentSession) {
              await onDeleteSession(currentSession as SqluiCore.Session);
            }
          } catch (err) {
            console.error("index.tsx:onDeleteSession", err);
          }

          appPlatform.toggleMenuItems(true, allMenuKeys);
          break;
        case "clientEvent/toggleDevtools":
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "D", ctrlKey: true, shiftKey: true, altKey: true }));
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
        const activeElement = document.activeElement;
        const activeInputTagName = activeElement?.tagName.toLowerCase();

        // with modifier key
        switch (key) {
          case "Enter":
            // Ctrl+Enter to execute the query
            // traverse up until we find the code editor wrapper or reach the root html element
            let currentDomNode = activeElement;
            let shouldExecuteQuery = false;
            while (currentDomNode) {
              if (currentDomNode.classList.contains("CodeEditorBox__QueryBox")) {
                shouldExecuteQuery = true;
                break;
              }
              currentDomNode = currentDomNode.parentElement;
            }

            try {
              if (shouldExecuteQuery) {
                (
                  document.querySelector(
                    ".AdvancedEditorContainer .inputarea.monaco-mouse-cursor-text,.SimpleEditorContainer",
                  ) as HTMLTextAreaElement
                ).blur();

                setTimeout(() => (document.querySelector("#btnExecuteCommand") as HTMLButtonElement).click());
                e.stopPropagation();
                e.preventDefault();
              }
            } catch (err) {
              console.error("index.tsx:preventDefault", err);
            }
            break;

          case "\\":
            // Cmd+\ / Alt+\ to toggle sidebar
            document.dispatchEvent(new Event("toggleSidebar"));
            e.stopPropagation();
            e.preventDefault();
            break;

          case "F":
            // Cmd+Shift+F / Ctrl+Shift+F / Alt+Shift+F to open Schema Search
            if (e.shiftKey) {
              e.stopPropagation();
              e.preventDefault();
              selectCommand({ event: "clientEvent/schema/search" });
            }
            break;

          case "f":
            try {
              // making sure we don't interfere Ctrl+f with other input
              if (activeInputTagName === "textarea" || activeInputTagName === "input") {
                return;
              }

              const resultSearchBox = document.querySelector("#result-box-search-input") as HTMLInputElement;
              if (resultSearchBox) {
                resultSearchBox.focus();
                e.stopPropagation();
                e.preventDefault();
              }
            } catch (err) {
              console.error("index.tsx:preventDefault", err);
            }
            break;
        }
      }
    };
    // this section below is strictly for mocked webserver
    const onKeyboardShortcutEventForMockedServer = (e: KeyboardEvent) => {
      const hasModifierKey = e.altKey || e.ctrlKey || e.metaKey;

      let command: Command | undefined;
      const { key } = e;

      if (hasModifierKey) {
        // with modifier key
        switch (key) {
          case "p":
            command = {
              event: "clientEvent/showCommandPalette",
            };
            break;

          case "t":
            command = {
              event: "clientEvent/query/new",
            };
            break;

          case "o":
            command = {
              event: "clientEvent/import",
            };
            break;

          case "s":
            command = {
              event: "clientEvent/exportAll",
            };
            break;

          case "n":
            command = {
              event: "clientEvent/connection/new",
            };
            break;

          case "w":
            command = {
              event: "clientEvent/query/closeCurrentlySelected",
            };
            break;

          case "{":
            command = {
              event: "clientEvent/query/showPrev",
            };
            break;

          case "}":
            command = {
              event: "clientEvent/query/showNext",
            };
            break;
        }
      } else {
        // no modifier key
        switch (key) {
          case "F2":
            command = {
              event: "clientEvent/query/rename",
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

    document.addEventListener("keydown", onKeyboardShortcutEventForAll, true);
    !appPlatform.isDesktop && document.addEventListener("keydown", onKeyboardShortcutEventForMockedServer, true);
    return () => {
      document.removeEventListener("keydown", onKeyboardShortcutEventForAll);
      !appPlatform.isDesktop && document.removeEventListener("keydown", onKeyboardShortcutEventForMockedServer);
    };
  }, []);

  return null;
}
