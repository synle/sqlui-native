import Electron from 'electron';

declare global {
  interface Window {
    isElectron: boolean;
    toggleElectronMenu: (visible: boolean, menus: any[]) => void;
    openBrowserLink: (link: string) => void;
    ipcRenderer?: Electron.IpcRenderer;
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
    | 'sqlite'
    | 'cassandra'
    | 'mongodb'
    | 'redis';

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

  export type ColumnMetaData = {
    name: string;
    type: string;
    allowNull?: boolean;
    primaryKey?: boolean;
    autoIncrement?: boolean;
    comment?: string | null;
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
    sql?: string;
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
    wordWrap?: 'wrap';
    queryTabOrientation?: 'vertical' | 'horizontal';
    querySize?: number;
  };

  export type SettingKey = keyof Settings;

  export type QueryKey =
    | 'qk.actionDialogs'
    | 'qk.missionControlCommand'
    | 'qk.connections'
    | 'qk.treeVisibles'
    | 'qk.queries'
    | 'qk.results'
    | 'qk.settings';
}

export module SqlAction {
  export type CoreInput = {
    dialect?: string;
    connectionId?: string;
    databaseId?: string;
    querySize: number;
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
    formatter?: 'sql' | 'js';
  };

  export type TableActionScriptGenerator = (
    input: SqlAction.TableInput,
  ) => SqlAction.Output | undefined;

  export type DatabaseActionScriptGenerator = (
    input: SqlAction.DatabaseInput,
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
    | 'clientEvent/showSettings'
    | 'clientEvent/changeDarkMode'
    | 'clientEvent/changeEditorMode'
    | 'clientEvent/changeWrapMode'
    | 'clientEvent/checkForUpdate'
    | 'clientEvent/showCommandPalette'
    | 'clientEvent/clearShowHides'
    | 'clientEvent/changeQueryTabOrientation'
    | 'clientEvent/showQueryHelp'
    | 'clientEvent/import'
    | 'clientEvent/exportAll'
    | 'clientEvent/connection/new'
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
    | 'clientEvent/query/reveal'
    | 'clientEvent/session/new'
    | 'clientEvent/session/rename'
    | 'clientEvent/session/switch';
}
