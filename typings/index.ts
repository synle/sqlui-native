import { ColumnDescription } from 'sequelize';

/**
 * Stores common typings used by both frontend and backend
 */
export module SqluiCore {
  export type Dialect = 'mysql' | 'mssql' | 'postgres' | 'sqlite' | string;

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

  export type ColumnMetaData = ColumnDescription & {
    name: string;
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

  export type RawData = Record<string, string | number | boolean>[];
  export type MetaData = Record<string, string | number | boolean>;

  export type Result = [RawData, MetaData];

  // connection queries
  export type CoreConnectionQuery = {
    id: string;
    name: string;
    connectionId?: string;
    databaseId?: string;
    sql?: string;
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
  export type ConnectionQuery = SqluiCore.CoreConnectionQuery & {
    lastExecuted?: string;
    selected?: boolean;
  };

  export interface AvailableConnectionProps {
    connectionId: string;
    databaseId: string;
    id: string;
    label: string;
  }

  export type TreeVisibilities = { [index: string]: boolean };

  export type QueryKey =
    | 'qk.actionDialogs'
    | 'qk.missionControlCommand'
    | 'qk.connections'
    | 'qk.treeVisibles'
    | 'qk.queries'
    | 'qk.results';
}

/**
 * This stores mostly keys used in our app
 */
export module SqluiEnums {
  /**
   * in memory cache keys used in the server
   * @type {String}
   */
  export type ServerApiCacheKey = 'cacheMetaData';

  /**
   * client config key used for storage on the client side
   * @type {String}
   */
  export type ClientConfigKey = 'cache.metadata' | 'cache.connectionQueries' | 'api.sessionId';

  /**
   * client side specific events, can be used by electron
   * to send message to client side
   * @type {String}
   */
  export type ClientEventKey =
    | 'clientEvent.newConnection'
    | 'clientEvent.newQuery'
    | 'clientEvent.import'
    | 'clientEvent.exportAll';
}
