import React from "react";
declare global {
  /** Extended Window interface with platform-specific properties and utilities. */
  interface Window {
    openBrowserLink: (link: string) => void;
    openAppLink: (link: string) => void;
  }
}

/**
 * Stores common typings used by both frontend and backend
 */
export module SqluiCore {
  /** Supported database dialect identifiers. */
  export type Dialect =
    | "mysql"
    | "mariadb"
    | "mssql"
    | "postgres"
    | "postgresql"
    | "sqlite"
    | "cassandra"
    | "mongodb"
    | "redis"
    | "rediss"
    | "cosmosdb"
    | "aztable"
    | "sfdc"
    | "rest"
    | "graphql";

  /** Supported programming language modes for code generation. */
  export type LanguageMode = "javascript" | "python" | "java";

  /** Server-side configuration settings. */
  export type ServerConfigs = {
    storageDir: string;
    isElectron: boolean;
    [key: string]: any;
  };

  /** A generic settings entry with an ID and arbitrary key-value pairs. */
  export type SettingsEntry = {
    id: string;
    [key: string]: any;
  };

  /** Core connection properties without an ID (used for creation). */
  export type CoreConnectionProps = {
    /**
     * The connection string, prefixed with a dialect scheme (`dialect://...`). Format varies by dialect:
     * - **URL** (relational databases, Cassandra, MongoDB, Redis): `dialect://user:pass@host:port`
     * - **JSON** (SFDC): `sfdc://{"username":"...","password":"...","securityToken":"..."}`
     * - **Microsoft-style** (Azure Table Storage, CosmosDB): `aztable://DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...`
     */
    connection: string;
    name: string;
    status?: "online" | "offline" | "loading";
    dialect?: SqluiCore.Dialect;
    /** Creation timestamp (epoch ms). Auto-set by PersistentStorage on add. */
    createdAt?: number;
    /** Last update timestamp (epoch ms). Auto-set by PersistentStorage on add/update. */
    updatedAt?: number;
    /** Adapter-specific properties for managed-metadata connections. */
    props?: ManagedProperties;
    [index: string]: any;
  };

  /** Connection properties with a required ID (persisted connection). */
  export type ConnectionProps = CoreConnectionProps & {
    id: string;
  };

  /** Metadata describing a foreign key reference to another table. */
  export type TableReferenceMetaData = {
    model: string;
    key: string;
    [index: string]: any;
  };

  type ColumnKindCassandra = "partition_key" | "clustering" | "regular";
  type ColumnKindRmdbs = "foreign_key";

  /** Metadata describing a single column in a table. */
  export type ColumnMetaData = {
    name: string;
    type: string;
    allowNull?: boolean;
    primaryKey?: boolean;
    autoIncrement?: boolean;
    comment?: string | null;
    references?: TableReferenceMetaData;
    /**
     * whether or not this is a complex type and nested inside another JSON
     * @type {boolean}
     */
    nested?: boolean;
    /**
     * the name of the parent property
     * @type {string}
     */
    propertyPath?: string[];
    /**
     * for cassandra, value can be `partition_key` or `clustering` or `regular`
     * for rdbms, value can be `foreign_key`
     */
    kind?: ColumnKindCassandra | ColumnKindRmdbs;
    // these applies for foreignkeys information for rdmbs
    referencedTableName?: string;
    referencedColumnName?: string;
    [index: string]: any;
  };

  /** Metadata describing a table and its columns. */
  export type TableMetaData = {
    /** Optional unique identifier (used by managed tables; defaults to name if absent). */
    id?: string;
    name: string;
    columns: ColumnMetaData[];
  };

  /** Metadata describing a database and its tables. */
  export type DatabaseMetaData = {
    name: string;
    tables: TableMetaData[];
  };

  /** A single diagnostic check result from a test connection. */
  export type ConnectionDiagnostic = {
    /** Name of the check (e.g., "HEAD", "GET", "OPTIONS"). */
    name: string;
    /** Whether the check passed. */
    success: boolean;
    /** Human-readable result message. */
    message: string;
  };

  /** Generic adapter-specific properties for managed metadata entries. */
  export type ManagedProperties = Record<string, any>;

  /** A user-managed database entry (e.g., a folder in REST API collections). */
  export type ManagedDatabase = {
    /** Unique identifier (same as name). */
    id: string;
    /** Display name of the database/folder. */
    name: string;
    /** Parent connection ID. */
    connectionId: string;
    /** Adapter-specific properties (e.g., folder-level variables for REST API). */
    props?: ManagedProperties;
    /** Creation timestamp (epoch ms). Auto-set by PersistentStorage. */
    createdAt?: number;
    /** Last update timestamp (epoch ms). Auto-set by PersistentStorage. */
    updatedAt?: number;
  };

  /** A user-managed table entry (e.g., a request in REST API collections). */
  export type ManagedTable = {
    /** Unique identifier (same as name). */
    id: string;
    /** Display name of the table/request. */
    name: string;
    /** Parent connection ID. */
    connectionId: string;
    /** Parent database/folder name. */
    databaseId: string;
    /** Adapter-specific properties (e.g., curl/fetch command for REST API). */
    props?: ManagedProperties;
    /** Creation timestamp (epoch ms). Auto-set by PersistentStorage. */
    createdAt?: number;
    /** Last update timestamp (epoch ms). Auto-set by PersistentStorage. */
    updatedAt?: number;
  };

  /** Core connection metadata including database information. */
  export type CoreConnectionMetaData = CoreConnectionProps & {
    databases: DatabaseMetaData[];
    /** Optional diagnostic results from the test connection. */
    diagnostics?: ConnectionDiagnostic[];
  };

  /** Full connection metadata combining connection props and database info. */
  export type ConnectionMetaData = CoreConnectionMetaData & ConnectionProps;

  /** Raw query result data as an array. */
  export type RawData = any[];
  /** Query result metadata. */
  export type MetaData = any;

  /** Result of a query execution. */
  export type Result = {
    ok: boolean;
    raw?: RawData;
    meta?: MetaData;
    error?: any;
    affectedRows?: number;
  };

  /** Core query properties without a guaranteed ID (used for creation). */
  export type CoreConnectionQuery = {
    id?: string;
    name?: string;
    connectionId?: string;
    databaseId?: string;
    /**
     * @type {string} only applicable for a few dialect (Azure CosmosDB at the moment)
     */
    tableId?: string;
    sql?: string;
    /**
     * @type {boolean} whether or not a query is pinned and can't be closed
     */
    pinned?: boolean;
    /** Creation timestamp (epoch ms). Auto-set by PersistentStorage on add. */
    createdAt?: number;
    /** Last update timestamp (epoch ms). Auto-set by PersistentStorage on add/update. */
    updatedAt?: number;
  };

  /** Persisted query with required ID and name. */
  export type ConnectionQuery = CoreConnectionQuery & {
    id: string;
    name: string;
  };

  /** Core session properties without a guaranteed ID (used for creation). */
  export type CoreSession = {
    id?: string;
    name: string;
    /** Creation timestamp (epoch ms). Auto-set by PersistentStorage on add. */
    createdAt?: number;
    /** Last update timestamp (epoch ms). Auto-set by PersistentStorage on add/update. */
    updatedAt?: number;
  };

  /** Persisted session with a required ID. */
  export type Session = CoreSession & {
    id: string;
  };

  /** Folder type identifier (e.g., "recycleBin", "bookmarks", or custom). */
  export type FolderType = "recycleBin" | "bookmarks" | string;

  /**
   * An item stored in a folder, discriminated by `type`.
   *
   * Used in three contexts:
   * - **Recycle Bin** — Connection, Query, or Session items backed up on deletion.
   * - **Bookmarks** — Connection or Query items saved by the user.
   * - **Query Version History** — Query items tracked on execution or delta changes (`type` is "execution" or "delta").
   */
  export type FolderItem = {
    id: string;
    /** Display name for the item (connection name, query name, or session name). Always set on creation. */
    name?: string;
    /** Creation timestamp (epoch ms). Auto-set by PersistentStorage on add. */
    createdAt?: number;
    /** Last update timestamp (epoch ms). Auto-set by PersistentStorage on add/update. */
    updatedAt?: number;
  } & (
    | {
        /** A saved or deleted connection (used in bookmarks and recycle bin). */
        type: "Connection";
        data: SqluiCore.ConnectionProps;
      }
    | {
        /** A saved or deleted query (used in bookmarks and recycle bin). */
        type: "Query";
        data: SqluiCore.ConnectionQuery;
      }
    | {
        /** A deleted session backup (used in recycle bin only). */
        type: "Session";
        data: SqluiCore.Session;
        /** Backed-up connections from the deleted session. */
        connections?: SqluiCore.ConnectionProps[];
      }
    | {
        /** A query history entry tracked on execution or delta change. */
        type: QueryVersionAuditType;
        data: SqluiCore.ConnectionQuery;
      }
  );

  /** Distributive Omit that preserves union discrimination. */
  type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

  /** A folder item without the server-generated `id` field, used when creating new items. */
  export type FolderItemInput = DistributiveOmit<FolderItem, "id">;

  /** Audit type for query version history entries. */
  export type QueryVersionAuditType = "execution" | "delta";

  /** A single result from a schema search, identifying a matched column and its location. */
  export type SchemaSearchResult = {
    connectionId: string;
    connectionName: string;
    connectionString: string;
    databaseId: string;
    tableId: string;
    column: ColumnMetaData;
  };

  /** Dictionary of key-value pairs representing a single data snapshot row. */
  export type DataSnapshotItemDictionary = Record<string, any>;

  /** A persisted snapshot of query result data. */
  export type DataSnapshot = {
    id: string;
    location: string;
    description: string;
    values: DataSnapshotItemDictionary[];
    /** Creation timestamp (epoch ms). Auto-set by PersistentStorage on add. */
    createdAt?: number;
    /** Last update timestamp (epoch ms). Auto-set by PersistentStorage on add/update. */
    updatedAt?: number;
  };
}

/**
 * Stores most of the typings used strictly by the frontend
 */
export module SqluiFrontend {
  /** Partial query with optional frontend-specific execution state. */
  export type PartialConnectionQuery = SqluiCore.CoreConnectionQuery & {
    selected?: boolean;
    /** Whether the query is currently being executed. Ephemeral — not persisted. */
    executing?: boolean;
    executionStart?: number;
    executionEnd?: number;
    result?: SqluiCore.Result;
    /** Whether this query's result is a restored snapshot (from bookmark or recycle bin). */
    isSnapshot?: boolean;
    /** Metadata captured at execution time — the actual query, connection, database, and table used. */
    executionDetails?: {
      /** The actual SQL/query string that was sent for execution. */
      sql?: string;
      /** The connection ID used at execution time. */
      connectionId?: string;
      /** The connection name at execution time. */
      connectionName?: string;
      /** The database ID used at execution time. */
      databaseId?: string;
      /** The table ID used at execution time. */
      tableId?: string;
    };
  };

  /** Full frontend connection query combining core and frontend-specific fields. */
  export type ConnectionQuery = SqluiCore.ConnectionQuery & SqluiFrontend.PartialConnectionQuery;

  /** Properties for a selectable connection option in the UI. */
  export interface AvailableConnectionProps {
    connectionId: string;
    databaseId: string;
    id: string;
    label: string;
  }

  /** Map of tree node IDs to their visibility state. */
  export type TreeVisibilities = { [index: string]: boolean };

  /** User-configurable application settings. */
  export type Settings = {
    darkMode?: "dark" | "light";
    animationMode?: "off" | "on";
    layoutMode?: "compact" | "comfortable";
    editorMode?: "advanced" | "simple";
    editorHeight?: "small" | "medium" | "full";
    tableRenderer?: "advanced" | "simple";
    wordWrap?: "wrap";
    queryTabOrientation?: "vertical" | "horizontal";
    querySize?: number;
    tablePageSize?: number;
    maxToasts?: number;
    /**
     * whether or not to open the bookmarked query in the same tab or new tab
     */
    querySelectionMode?: "same-tab" | "new-tab";
    deleteMode?: "soft-delete" | "hard-delete";
  };

  /** Valid keys for accessing individual settings. */
  export type SettingKey = keyof Settings;

  /** React Query cache key identifiers used for data fetching. */
  export type QueryKey = "actionDialogs" | "missionControlCommand" | "connections" | "treeVisibles" | "queries" | "results" | "settings";

  /** Type of migration operation to perform. */
  export type MigrationType = "insert" | "create";

  /** Mode for migration: from a live connection or from raw JSON data. */
  export type MigrationMode = "real_connection" | "raw_json";
}

/**
 * Types for SQL/NoSQL script generation actions.
 */
export module SqlAction {
  /** Input identifying a connection and its dialect. */
  export type ConnectionInput = {
    dialect?: string;
    connectionId?: string;
  };

  /** Core input extending connection info with database and query size. */
  export type CoreInput = ConnectionInput & {
    databaseId?: string;
    querySize?: number;
  };

  /** Input for database-level script generation, including table metadata. */
  export type DatabaseInput = SqlAction.CoreInput & {
    tables?: SqluiCore.TableMetaData[];
  };

  /** Input for table-level script generation, including column metadata. */
  export type TableInput = SqlAction.CoreInput & {
    tableId?: string;
    columns?: SqluiCore.ColumnMetaData[];
  };

  /** Output of a script generation action, including label, query, and optional UI elements. */
  export type Output = {
    label: string;
    query?: string;
    description?: string;
    icon?: React.JSX.Element;
    formatter?: "sql" | "js" | "shell" | "graphql";
    /**
     * if true, will skip when we attempt to generate the guide docs
     * @type {[type]}
     */
    skipGuide?: boolean;
    onClick?: () => void;
    startIcon?: React.JSX.Element;
    disabled?: boolean;
  };

  /** Function that generates a script action for a table-level operation. */
  export type TableActionScriptGenerator = (input: SqlAction.TableInput) => SqlAction.Output | undefined;

  /** Function that generates a script action for a database-level operation. */
  export type DatabaseActionScriptGenerator = (input: SqlAction.DatabaseInput) => SqlAction.Output | undefined;

  /** Function that generates a script action for a connection-level operation. */
  export type ConnectionActionScriptGenerator = (input: SqlAction.ConnectionInput) => SqlAction.Output | undefined;
}

/**
 * This stores mostly keys used in our app
 */
export module SqluiEnums {
  /**
   * in memory cache keys used in the server
   * @type {String}
   */
  export type ServerApiCacheKey = "serverCacheKey/cacheMetaData";

  /**
   * client config key used for storage on the client side
   * @type {String}
   */
  export type ClientConfigKey =
    | "clientConfig/cache.connectionQueries"
    | "clientConfig/cache.treeVisibles"
    | "clientConfig/cache.settings"
    | "clientConfig/leftPanelWidth"
    | "clientConfig/api.sessionId";

  /**
   * client side specific events, can be used by electron
   * to send message to client side
   * @type {String}
   */
  export type ClientEventKey =
    | "clientEvent/bookmark/show"
    | "clientEvent/changeAnimationMode"
    | "clientEvent/changeAnimationMode/off"
    | "clientEvent/changeAnimationMode/on"
    | "clientEvent/changeAnimationMode/system"
    | "clientEvent/changeDarkMode"
    | "clientEvent/changeEditorHeight/small"
    | "clientEvent/changeEditorHeight/medium"
    | "clientEvent/changeEditorHeight/full"
    | "clientEvent/changeEditorMode"
    | "clientEvent/changeLayoutMode"
    | "clientEvent/changeLayoutMode/comfortable"
    | "clientEvent/changeLayoutMode/compact"
    | "clientEvent/changeQuerySelectionMode"
    | "clientEvent/changeQueryTabOrientation"
    | "clientEvent/changeWrapMode"
    | "clientEvent/checkForUpdate"
    | "clientEvent/clearShowHides"
    | "clientEvent/connection/addToBookmark"
    | "clientEvent/connection/delete"
    | "clientEvent/connection/duplicate"
    | "clientEvent/connection/export"
    | "clientEvent/connection/exportAsPostman"
    | "clientEvent/connection/importCollection"
    | "clientEvent/connection/new"
    | "clientEvent/connection/refresh"
    | "clientEvent/connection/refreshAll"
    | "clientEvent/connection/select"
    | "clientEvent/exportAll"
    | "clientEvent/import"
    | "clientEvent/navigate"
    | "clientEvent/openAppWindow"
    | "clientEvent/openExternalUrl"
    | "clientEvent/query/addToBookmark"
    | "clientEvent/query/apply"
    | "clientEvent/query/apply/active"
    | "clientEvent/query/apply/new"
    | "clientEvent/query/changeTabOrdering"
    | "clientEvent/query/close"
    | "clientEvent/query/closeCurrentlySelected"
    | "clientEvent/query/closeOther"
    | "clientEvent/query/closeToTheRight"
    | "clientEvent/query/duplicate"
    | "clientEvent/query/export"
    | "clientEvent/query/history"
    | "clientEvent/query/new"
    | "clientEvent/query/pin"
    | "clientEvent/query/rename"
    | "clientEvent/query/reveal"
    | "clientEvent/query/revealThisOnly"
    | "clientEvent/query/show"
    | "clientEvent/query/showNext"
    | "clientEvent/query/showPrev"
    | "clientEvent/query/showSampleCodeSnippet"
    | "clientEvent/query/unpin"
    | "clientEvent/record/edit"
    | "clientEvent/record/new"
    | "clientEvent/record/showDetails"
    | "clientEvent/session/clone"
    | "clientEvent/session/delete"
    | "clientEvent/session/new"
    | "clientEvent/session/rename"
    | "clientEvent/session/switch"
    | "clientEvent/showCommandPalette"
    | "clientEvent/showConnectionHelper"
    | "clientEvent/showQueryHelp"
    | "clientEvent/schema/search"
    | "clientEvent/showSettings"
    | "clientEvent/tableRenderer"
    | "clientEvent/toggleDevtools"
    | "clientEvent/toggleSidebar";
}
