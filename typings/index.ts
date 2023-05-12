import Electron from 'electron';
declare global {
  interface Window {
    isElectron: boolean;
    toggleElectronMenu: (visible: boolean, menus: any[]) => void;
    openBrowserLink: (link: string) => void;
    openAppLink: (link: string) => void;
    ipcRenderer?: Electron.IpcRenderer;
    requireElectron: (importPath: string) => any;
  }
}

/**
 * Stores common typings used by both frontend and backend
 */
export module SqluiCore {
  export type Dialect =
    | 'mysql'
    | 'mariadb'
    | 'mssql'
    | 'postgres'
    | 'postgresql'
    | 'sqlite'
    | 'cassandra'
    | 'mongodb'
    | 'redis'
    | 'rediss'
    | 'cosmosdb'
    | 'aztable';

  export type LanguageMode = 'javascript' | 'python' | 'java';

  export type ServerConfigs = {
    storageDir: string;
    isElectron: boolean;
  };

  export type CoreConnectionProps = {
    connection: string;
    name: string;
    status?: 'online' | 'offline';
    dialect?: SqluiCore.Dialect;
    [index: string]: any;
  };

  export type ConnectionProps = CoreConnectionProps & {
    id: string;
  };

  export type TableReferenceMetaData = {
    model: string;
    key: string;
    [index: string]: any;
  };

  type ColumnKindCassandra = 'partition_key' | 'clustering' | 'regular';
  type ColumnKindRmdbs = 'foreign_key';

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

  export type TableMetaData = {
    name: string;
    columns: ColumnMetaData[];
  };

  export type DatabaseMetaData = {
    name: string;
    tables: TableMetaData[];
  };

  export type CoreConnectionMetaData = CoreConnectionProps & {
    databases: DatabaseMetaData[];
  };

  export type ConnectionMetaData = CoreConnectionMetaData & ConnectionProps;

  export type RawData = any[];
  export type MetaData = any;

  export type Result = {
    ok: boolean;
    raw?: RawData;
    meta?: MetaData;
    error?: any;
    affectedRows?: number;
  };

  // connection queries
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
  };

  export type ConnectionQuery = CoreConnectionQuery & {
    id: string;
    name: string;
  };

  // session
  export type CoreSession = {
    id?: string;
    name: string;
    created?: number;
    lastUpdated?: number;
  };

  export type Session = CoreSession & {
    id: string;
  };

  export type FolderType = 'recycleBin' | 'bookmarks' | string;

  export type FolderItem = {
    id: string;
    name?: string;
  } & (
    | {
        type: 'Connection';
        data: SqluiCore.ConnectionProps;
      }
    | {
        type: 'Query';
        data: SqluiCore.ConnectionQuery;
      }
  );

  export type DataSnapshotItemDictionary = Record<string, any>;

  export type DataSnapshot = {
    id: string;
    description: string;
    values: DataSnapshotItemDictionary[];
    created: number;
  };
}

/**
 * Stores most of the typings used strictly by the frontend
 */
export module SqluiFrontend {
  // connection queries
  export type PartialConnectionQuery = SqluiCore.CoreConnectionQuery & {
    selected?: boolean;
    executionStart?: number;
    executionEnd?: number;
    result?: SqluiCore.Result;
  };

  export type ConnectionQuery = SqluiCore.ConnectionQuery & SqluiFrontend.PartialConnectionQuery;

  export interface AvailableConnectionProps {
    connectionId: string;
    databaseId: string;
    id: string;
    label: string;
  }

  export type TreeVisibilities = { [index: string]: boolean };

  export type Settings = {
    darkMode?: 'dark' | 'light';
    editorMode?: 'advanced' | 'simple';
    tableRenderer?: 'advanced' | 'simple';
    wordWrap?: 'wrap';
    queryTabOrientation?: 'vertical' | 'horizontal';
    querySize?: number;
    tablePageSize?: number;
    /**
     * whether or not to open the bookmarked query in the same tab or new tab
     */
    querySelectionMode?: 'same-tab' | 'new-tab';
    deleteMode?: 'soft-delete' | 'hard-delete';
  };

  export type SettingKey = keyof Settings;

  export type QueryKey =
    | 'actionDialogs'
    | 'missionControlCommand'
    | 'connections'
    | 'treeVisibles'
    | 'queries'
    | 'results'
    | 'settings';

  export type MigrationType = 'insert' | 'create';

  export type MigrationMode = 'real_connection' | 'raw_json';
}

export module SqlAction {
  export type ConnectionInput = {
    dialect?: string;
    connectionId?: string;
  };

  export type CoreInput = ConnectionInput & {
    databaseId?: string;
    querySize?: number;
  };

  export type DatabaseInput = SqlAction.CoreInput & {
    tables?: SqluiCore.TableMetaData[];
  };

  export type TableInput = SqlAction.CoreInput & {
    tableId?: string;
    columns?: SqluiCore.ColumnMetaData[];
  };

  export type Output = {
    label: string;
    query?: string;
    description?: string;
    icon?: JSX.Element;
    formatter?: 'sql' | 'js';
    /**
     * if true, will skip when we attempt to generate the guide docs
     * @type {[type]}
     */
    skipGuide?: boolean;
    onClick?: () => void;
    startIcon?: JSX.Element;
  };

  export type TableActionScriptGenerator = (
    input: SqlAction.TableInput,
  ) => SqlAction.Output | undefined;

  export type DatabaseActionScriptGenerator = (
    input: SqlAction.DatabaseInput,
  ) => SqlAction.Output | undefined;

  export type ConnectionActionScriptGenerator = (
    input: SqlAction.ConnectionInput,
  ) => SqlAction.Output | undefined;
}

/**
 * This stores mostly keys used in our app
 */
export module SqluiEnums {
  /**
   * in memory cache keys used in the server
   * @type {String}
   */
  export type ServerApiCacheKey = 'serverCacheKey/cacheMetaData';

  /**
   * client config key used for storage on the client side
   * @type {String}
   */
  export type ClientConfigKey =
    | 'clientConfig/cache.connectionQueries'
    | 'clientConfig/cache.treeVisibles'
    | 'clientConfig/cache.settings'
    | 'clientConfig/leftPanelWidth'
    | 'clientConfig/api.sessionId';

  /**
   * client side specific events, can be used by electron
   * to send message to client side
   * @type {String}
   */
  export type ClientEventKey =
    | 'clientEvent/navigate'
    | 'clientEvent/showSettings'
    | 'clientEvent/changeDarkMode'
    | 'clientEvent/changeEditorMode'
    | 'clientEvent/tableRenderer'
    | 'clientEvent/changeWrapMode'
    | 'clientEvent/checkForUpdate'
    | 'clientEvent/showCommandPalette'
    | 'clientEvent/openExternalUrl'
    | 'clientEvent/clearShowHides'
    | 'clientEvent/changeQueryTabOrientation'
    | 'clientEvent/showQueryHelp'
    | 'clientEvent/showConnectionHelper'
    | 'clientEvent/import'
    | 'clientEvent/exportAll'
    | 'clientEvent/changeQuerySelectionMode'
    | 'clientEvent/connection/new'
    | 'clientEvent/connection/delete'
    | 'clientEvent/connection/refresh'
    | 'clientEvent/connection/duplicate'
    | 'clientEvent/connection/export'
    | 'clientEvent/connection/select'
    | 'clientEvent/connection/addToBookmark'
    | 'clientEvent/query/apply/active' // currently selected / active query only
    | 'clientEvent/query/apply/new' // create new query and apply
    | 'clientEvent/query/apply' // based on the setting use either new query or selected query
    | 'clientEvent/query/pin'
    | 'clientEvent/query/unpin'
    | 'clientEvent/query/new'
    | 'clientEvent/query/rename'
    | 'clientEvent/query/export'
    | 'clientEvent/query/duplicate'
    | 'clientEvent/query/changeTabOrdering'
    | 'clientEvent/query/show'
    | 'clientEvent/query/showNext'
    | 'clientEvent/query/showPrev'
    | 'clientEvent/query/close'
    | 'clientEvent/query/closeCurrentlySelected'
    | 'clientEvent/query/closeOther'
    | 'clientEvent/query/closeToTheRight'
    | 'clientEvent/query/reveal'
    | 'clientEvent/query/revealThisOnly'
    | 'clientEvent/query/addToBookmark'
    | 'clientEvent/query/showSampleCodeSnippet'
    | 'clientEvent/record/showDetails'
    | 'clientEvent/record/edit'
    | 'clientEvent/record/new'
    | 'clientEvent/record/edit' // TODO: to be implemented
    | 'clientEvent/session/new'
    | 'clientEvent/session/rename'
    | 'clientEvent/session/switch'
    | 'clientEvent/session/delete'
    | 'clientEvent/session/clone'
    | 'clientEvent/bookmark/show';
}
