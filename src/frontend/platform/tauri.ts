/** Tauri desktop platform implementation using @tauri-apps/api. */
import type { PlatformBridge } from "src/frontend/platform/types";

/** Route definition: HTTP method, URL pattern regex, Tauri command name, and param extractor. */
type Route = {
  method: string;
  pattern: RegExp;
  command: string;
  extractParams: (match: RegExpMatchArray) => Record<string, string>;
};

/** Maps HTTP method + URL to a Tauri invoke command name and extracted URL params. */
function mapUrlToCommand(method: string, url: string): { commandName: string; params: Record<string, string> } {
  const m = method.toUpperCase();
  const path = url.split("?")[0]; // Strip query string
  const query = parseQueryString(url);

  const routes: Route[] = [
    // Config
    { method: "GET", pattern: /^\/api\/configs$/, command: "get_configs", extractParams: () => ({}) },
    { method: "PUT", pattern: /^\/api\/configs$/, command: "update_configs", extractParams: () => ({}) },
    // Backup
    { method: "GET", pattern: /^\/api\/backup\/database$/, command: "backup_database", extractParams: () => ({}) },
    // Sessions
    { method: "GET", pattern: /^\/api\/sessions\/opened$/, command: "get_opened_sessions", extractParams: () => ({}) },
    { method: "POST", pattern: /^\/api\/sessions\/ping$/, command: "ping_session", extractParams: () => ({}) },
    { method: "GET", pattern: /^\/api\/sessions$/, command: "get_sessions", extractParams: () => ({}) },
    { method: "GET", pattern: /^\/api\/session$/, command: "get_session", extractParams: () => ({}) },
    {
      method: "POST",
      pattern: /^\/api\/session\/([^/]+)\/clone$/,
      command: "clone_session",
      extractParams: (match) => ({ sessionId: match[1] }),
    },
    { method: "POST", pattern: /^\/api\/session$/, command: "create_session", extractParams: () => ({}) },
    { method: "PUT", pattern: /^\/api\/session\/([^/]+)$/, command: "update_session", extractParams: (match) => ({ sessionId: match[1] }) },
    {
      method: "DELETE",
      pattern: /^\/api\/session\/([^/]+)$/,
      command: "delete_session",
      extractParams: (match) => ({ sessionId: match[1] }),
    },
    // Schema search
    { method: "GET", pattern: /^\/api\/schema\/search$/, command: "search_schema", extractParams: () => ({ q: query.q || "" }) },
    // Query version history
    { method: "GET", pattern: /^\/api\/queryVersionHistory$/, command: "get_query_version_history", extractParams: () => ({}) },
    { method: "POST", pattern: /^\/api\/queryVersionHistory$/, command: "add_query_version_history", extractParams: () => ({}) },
    {
      method: "DELETE",
      pattern: /^\/api\/queryVersionHistory\/([^/]+)$/,
      command: "delete_query_version_history_entry",
      extractParams: (match) => ({ entryId: match[1] }),
    },
    { method: "DELETE", pattern: /^\/api\/queryVersionHistory$/, command: "clear_query_version_history", extractParams: () => ({}) },
    // Data snapshots
    { method: "GET", pattern: /^\/api\/dataSnapshots$/, command: "get_data_snapshots", extractParams: () => ({}) },
    {
      method: "GET",
      pattern: /^\/api\/dataSnapshot\/([^/]+)$/,
      command: "get_data_snapshot",
      extractParams: (match) => ({ dataSnapshotId: match[1] }),
    },
    { method: "POST", pattern: /^\/api\/dataSnapshot$/, command: "create_data_snapshot", extractParams: () => ({}) },
    {
      method: "DELETE",
      pattern: /^\/api\/dataSnapshot\/([^/]+)$/,
      command: "delete_data_snapshot",
      extractParams: (match) => ({ dataSnapshotId: match[1] }),
    },
    // Connections
    { method: "GET", pattern: /^\/api\/connections$/, command: "get_connections", extractParams: () => ({}) },
    { method: "POST", pattern: /^\/api\/connections$/, command: "set_connections", extractParams: () => ({}) },
    { method: "POST", pattern: /^\/api\/connection\/test$/, command: "test_connection", extractParams: () => ({}) },
    // Managed metadata (must be before generic connection routes)
    {
      method: "GET",
      pattern: /^\/api\/connection\/([^/]+)\/managedDatabases$/,
      command: "get_managed_databases",
      extractParams: (match) => ({ connectionId: match[1] }),
    },
    {
      method: "GET",
      pattern: /^\/api\/connection\/([^/]+)\/managedTables$/,
      command: "get_managed_tables",
      extractParams: (match) => ({ connectionId: match[1] }),
    },
    {
      method: "POST",
      pattern: /^\/api\/connection\/([^/]+)\/managedDatabase$/,
      command: "create_managed_database",
      extractParams: (match) => ({ connectionId: match[1] }),
    },
    {
      method: "GET",
      pattern: /^\/api\/connection\/([^/]+)\/managedDatabase\/([^/]+)$/,
      command: "get_managed_database",
      extractParams: (match) => ({ connectionId: match[1], managedDatabaseId: match[2] }),
    },
    {
      method: "PUT",
      pattern: /^\/api\/connection\/([^/]+)\/managedDatabase\/([^/]+)$/,
      command: "update_managed_database",
      extractParams: (match) => ({ connectionId: match[1], managedDatabaseId: match[2] }),
    },
    {
      method: "DELETE",
      pattern: /^\/api\/connection\/([^/]+)\/managedDatabase\/([^/]+)$/,
      command: "delete_managed_database",
      extractParams: (match) => ({ connectionId: match[1], managedDatabaseId: match[2] }),
    },
    {
      method: "POST",
      pattern: /^\/api\/connection\/([^/]+)\/database\/([^/]+)\/managedTable$/,
      command: "create_managed_table",
      extractParams: (match) => ({ connectionId: match[1], databaseId: match[2] }),
    },
    {
      method: "GET",
      pattern: /^\/api\/connection\/([^/]+)\/database\/([^/]+)\/managedTable\/([^/]+)$/,
      command: "get_managed_table",
      extractParams: (match) => ({ connectionId: match[1], databaseId: match[2], managedTableId: match[3] }),
    },
    {
      method: "PUT",
      pattern: /^\/api\/connection\/([^/]+)\/database\/([^/]+)\/managedTable\/([^/]+)$/,
      command: "update_managed_table",
      extractParams: (match) => ({ connectionId: match[1], databaseId: match[2], managedTableId: match[3] }),
    },
    {
      method: "DELETE",
      pattern: /^\/api\/connection\/([^/]+)\/database\/([^/]+)\/managedTable\/([^/]+)$/,
      command: "delete_managed_table",
      extractParams: (match) => ({ connectionId: match[1], databaseId: match[2], managedTableId: match[3] }),
    },
    // Connection schema endpoints
    {
      method: "GET",
      pattern: /^\/api\/connection\/([^/]+)\/database\/([^/]+)\/schema\/cached$/,
      command: "get_cached_schema",
      extractParams: (match) => ({ connectionId: match[1], databaseId: match[2] }),
    },
    {
      method: "POST",
      pattern: /^\/api\/connection\/([^/]+)\/database\/([^/]+)\/table\/([^/]+)\/refresh$/,
      command: "refresh_table",
      extractParams: (match) => ({ connectionId: match[1], databaseId: match[2], tableId: match[3] }),
    },
    {
      method: "GET",
      pattern: /^\/api\/connection\/([^/]+)\/database\/([^/]+)\/table\/([^/]+)\/columns$/,
      command: "get_columns",
      extractParams: (match) => ({ connectionId: match[1], databaseId: match[2], tableId: match[3] }),
    },
    {
      method: "GET",
      pattern: /^\/api\/connection\/([^/]+)\/database\/([^/]+)\/tables$/,
      command: "get_tables",
      extractParams: (match) => ({ connectionId: match[1], databaseId: match[2] }),
    },
    {
      method: "POST",
      pattern: /^\/api\/connection\/([^/]+)\/database\/([^/]+)\/refresh$/,
      command: "refresh_database",
      extractParams: (match) => ({ connectionId: match[1], databaseId: match[2] }),
    },
    {
      method: "GET",
      pattern: /^\/api\/connection\/([^/]+)\/databases$/,
      command: "get_databases",
      extractParams: (match) => ({ connectionId: match[1] }),
    },
    {
      method: "POST",
      pattern: /^\/api\/connection\/([^/]+)\/refresh$/,
      command: "refresh_connection",
      extractParams: (match) => ({ connectionId: match[1] }),
    },
    {
      method: "POST",
      pattern: /^\/api\/connection\/([^/]+)\/connect$/,
      command: "connect_connection",
      extractParams: (match) => ({ connectionId: match[1] }),
    },
    {
      method: "POST",
      pattern: /^\/api\/connection\/([^/]+)\/execute$/,
      command: "execute_query",
      extractParams: (match) => ({ connectionId: match[1] }),
    },
    { method: "POST", pattern: /^\/api\/connection$/, command: "create_connection", extractParams: () => ({}) },
    {
      method: "PUT",
      pattern: /^\/api\/connection\/([^/]+)$/,
      command: "update_connection",
      extractParams: (match) => ({ connectionId: match[1] }),
    },
    {
      method: "DELETE",
      pattern: /^\/api\/connection\/([^/]+)$/,
      command: "delete_connection",
      extractParams: (match) => ({ connectionId: match[1] }),
    },
    {
      method: "GET",
      pattern: /^\/api\/connection\/([^/]+)$/,
      command: "get_connection",
      extractParams: (match) => ({ connectionId: match[1] }),
    },
    // Queries
    { method: "GET", pattern: /^\/api\/queries$/, command: "get_queries", extractParams: () => ({}) },
    { method: "POST", pattern: /^\/api\/query$/, command: "create_query", extractParams: () => ({}) },
    { method: "PUT", pattern: /^\/api\/query\/([^/]+)$/, command: "update_query", extractParams: (match) => ({ queryId: match[1] }) },
    { method: "DELETE", pattern: /^\/api\/query\/([^/]+)$/, command: "delete_query", extractParams: (match) => ({ queryId: match[1] }) },
    // Folder items
    { method: "GET", pattern: /^\/api\/folder\/([^/]+)$/, command: "get_folder_items", extractParams: (match) => ({ folderId: match[1] }) },
    { method: "POST", pattern: /^\/api\/folder\/([^/]+)$/, command: "add_folder_item", extractParams: (match) => ({ folderId: match[1] }) },
    {
      method: "PUT",
      pattern: /^\/api\/folder\/([^/]+)$/,
      command: "update_folder_item",
      extractParams: (match) => ({ folderId: match[1] }),
    },
    {
      method: "DELETE",
      pattern: /^\/api\/folder\/([^/]+)\/([^/]+)$/,
      command: "delete_folder_item",
      extractParams: (match) => ({ folderId: match[1], itemId: match[2] }),
    },
  ];

  for (const route of routes) {
    if (route.method === m) {
      const match = path.match(route.pattern);
      if (match) {
        const raw = route.extractParams(match);
        // Decode URI-encoded params (e.g., "Folder%201" → "Folder 1")
        const params: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          try {
            params[k] = decodeURIComponent(v);
          } catch {
            params[k] = v;
          }
        }
        return { commandName: route.command, params };
      }
    }
  }

  // Fallback: convert URL to snake_case command
  console.warn(`No Tauri command mapping for ${m} ${url}`);
  return { commandName: "unknown_command", params: {} };
}

/** Parses query string parameters from a URL. */
function parseQueryString(url: string): Record<string, string> {
  const qs: Record<string, string> = {};
  const qsIndex = url.indexOf("?");
  if (qsIndex >= 0) {
    const pairs = url.substring(qsIndex + 1).split("&");
    for (const pair of pairs) {
      const [key, val] = pair.split("=");
      if (key) qs[decodeURIComponent(key)] = decodeURIComponent(val || "");
    }
  }
  return qs;
}

export const tauriPlatform: PlatformBridge = {
  isDesktop: true,

  openExternalUrl(url: string) {
    import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(url));
  },

  openAppWindow(hashLink: string) {
    import("@tauri-apps/api/webviewWindow").then(({ WebviewWindow }) => {
      const label = `window-${Date.now()}`;
      new WebviewWindow(label, { url: `/#${hashLink}` });
    });
  },

  toggleMenuItems(visible: boolean, menuIds: string[]) {
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("toggle_menus", { visible, menuIds });
    });
  },

  readFileContent(file: File): Promise<string> {
    return file.text();
  },

  executeShellCommand(command: string): Promise<string> {
    return import("@tauri-apps/plugin-shell").then(({ Command }) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const shell = isMac ? "sh" : "cmd";
      const args = isMac ? ["-c", command] : ["/C", command];
      return Command.create(shell, args)
        .execute()
        .then((output) => output.stdout);
    });
  },

  getFilePath(_file: File): string | null {
    // Tauri doesn't expose file paths from drag-drop the same way as Electron.
    // Use readFileContent instead.
    return null;
  },

  onAppCommand(callback: (event: string) => void): () => void {
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<string>("app://command", (event) => {
        callback(event.payload);
      }).then((fn) => {
        unlisten = fn;
      });
    });
    return () => {
      if (unlisten) unlisten();
    };
  },

  async backendFetch(method: string, url: string, body?: any, sessionId?: string): Promise<any> {
    const { invoke } = await import("@tauri-apps/api/core");
    const { commandName, params } = mapUrlToCommand(method, url);
    const args: any = { ...params };
    if (body !== undefined) args.body = body;
    if (sessionId) args.sessionId = sessionId;
    return invoke(commandName, args);
  },
};
