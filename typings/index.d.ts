/// <reference types="react" />
import Electron from 'electron';
declare global {
    interface Window {
        isElectron: boolean;
        toggleElectronMenu: (visible: boolean, menus: any[]) => void;
        openBrowserLink: (link: string) => void;
        ipcRenderer?: Electron.IpcRenderer;
        requireElectron: (importPath: string) => any;
    }
}
export declare module SqluiCore {
    export type Dialect = 'mysql' | 'mariadb' | 'mssql' | 'postgres' | 'postgresql' | 'sqlite' | 'cassandra' | 'mongodb' | 'redis' | 'rediss' | 'cosmosdb' | 'aztable';
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
        nested?: boolean;
        propertyPath?: string[];
        kind?: ColumnKindCassandra | ColumnKindRmdbs;
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
    export type CoreConnectionQuery = {
        id?: string;
        name?: string;
        connectionId?: string;
        databaseId?: string;
        tableId?: string;
        sql?: string;
        pinned?: boolean;
    };
    export type ConnectionQuery = CoreConnectionQuery & {
        id: string;
        name: string;
    };
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
    } & ({
        type: 'Connection';
        data: SqluiCore.ConnectionProps;
    } | {
        type: 'Query';
        data: SqluiCore.ConnectionQuery;
    });
    export {};
}
export declare module SqluiFrontend {
    type PartialConnectionQuery = SqluiCore.CoreConnectionQuery & {
        selected?: boolean;
        executionStart?: number;
        executionEnd?: number;
        result?: SqluiCore.Result;
    };
    type ConnectionQuery = SqluiCore.ConnectionQuery & SqluiFrontend.PartialConnectionQuery;
    interface AvailableConnectionProps {
        connectionId: string;
        databaseId: string;
        id: string;
        label: string;
    }
    type TreeVisibilities = {
        [index: string]: boolean;
    };
    type Settings = {
        darkMode?: 'dark' | 'light';
        editorMode?: 'advanced' | 'simple';
        wordWrap?: 'wrap';
        queryTabOrientation?: 'vertical' | 'horizontal';
        querySize?: number;
        tablePageSize?: number;
        querySelectionMode?: 'same-tab' | 'new-tab';
        deleteMode?: 'soft-delete' | 'hard-delete';
    };
    type SettingKey = keyof Settings;
    type QueryKey = 'actionDialogs' | 'missionControlCommand' | 'connections' | 'treeVisibles' | 'queries' | 'results' | 'settings';
    type MigrationType = 'insert' | 'create';
    type MigrationMode = 'real_connection' | 'raw_json';
}
export declare module SqlAction {
    type ConnectionInput = {
        dialect?: string;
        connectionId?: string;
    };
    type CoreInput = ConnectionInput & {
        databaseId?: string;
        querySize?: number;
    };
    type DatabaseInput = SqlAction.CoreInput & {
        tables?: SqluiCore.TableMetaData[];
    };
    type TableInput = SqlAction.CoreInput & {
        tableId?: string;
        columns?: SqluiCore.ColumnMetaData[];
    };
    type Output = {
        label: string;
        query?: string;
        description?: string;
        icon?: JSX.Element;
        formatter?: 'sql' | 'js';
        skipGuide?: boolean;
        onClick?: () => void;
        startIcon?: JSX.Element;
    };
    type TableActionScriptGenerator = (input: SqlAction.TableInput) => SqlAction.Output | undefined;
    type DatabaseActionScriptGenerator = (input: SqlAction.DatabaseInput) => SqlAction.Output | undefined;
    type ConnectionActionScriptGenerator = (input: SqlAction.ConnectionInput) => SqlAction.Output | undefined;
}
export declare module SqluiEnums {
    type ServerApiCacheKey = 'serverCacheKey/cacheMetaData';
    type ClientConfigKey = 'clientConfig/cache.connectionQueries' | 'clientConfig/cache.treeVisibles' | 'clientConfig/cache.settings' | 'clientConfig/leftPanelWidth' | 'clientConfig/api.sessionId';
    type ClientEventKey = 'clientEvent/navigate' | 'clientEvent/showSettings' | 'clientEvent/changeDarkMode' | 'clientEvent/changeEditorMode' | 'clientEvent/changeWrapMode' | 'clientEvent/checkForUpdate' | 'clientEvent/showCommandPalette' | 'clientEvent/openExternalUrl' | 'clientEvent/clearShowHides' | 'clientEvent/changeQueryTabOrientation' | 'clientEvent/showQueryHelp' | 'clientEvent/showConnectionHelper' | 'clientEvent/import' | 'clientEvent/exportAll' | 'clientEvent/changeQuerySelectionMode' | 'clientEvent/connection/new' | 'clientEvent/connection/delete' | 'clientEvent/connection/refresh' | 'clientEvent/connection/duplicate' | 'clientEvent/connection/export' | 'clientEvent/connection/select' | 'clientEvent/connection/addToBookmark' | 'clientEvent/query/apply/active' | 'clientEvent/query/apply/new' | 'clientEvent/query/apply' | 'clientEvent/query/pin' | 'clientEvent/query/unpin' | 'clientEvent/query/new' | 'clientEvent/query/rename' | 'clientEvent/query/export' | 'clientEvent/query/duplicate' | 'clientEvent/query/changeTabOrdering' | 'clientEvent/query/show' | 'clientEvent/query/showNext' | 'clientEvent/query/showPrev' | 'clientEvent/query/close' | 'clientEvent/query/closeCurrentlySelected' | 'clientEvent/query/closeOther' | 'clientEvent/query/closeToTheRight' | 'clientEvent/query/reveal' | 'clientEvent/query/revealThisOnly' | 'clientEvent/query/addToBookmark' | 'clientEvent/query/showSampleCodeSnippet' | 'clientEvent/record/showDetails' | 'clientEvent/record/edit' | 'clientEvent/record/new' | 'clientEvent/record/edit' | 'clientEvent/session/new' | 'clientEvent/session/rename' | 'clientEvent/session/switch' | 'clientEvent/session/delete' | 'clientEvent/session/clone' | 'clientEvent/bookmark/show';
}
