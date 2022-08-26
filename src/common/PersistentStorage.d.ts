import { SqluiCore } from 'typings';
declare type StorageEntry = {
    id: string;
    [index: string]: any;
};
export declare const storageDir: string;
export declare class PersistentStorage<T extends StorageEntry> {
    instanceId: string;
    name: string;
    storageLocation: string;
    constructor(instanceId: string, name: string, storageLocation?: string);
    private getData;
    private setData;
    add<K>(entry: K): T;
    update(entry: T): T;
    set(entries: T[]): T[];
    list(): T[];
    get(id: string): T;
    delete(id: string): void;
}
export default PersistentStorage;
export declare function getConnectionsStorage(sessionId: string): Promise<PersistentStorage<SqluiCore.ConnectionProps>>;
export declare function getQueryStorage(sessionId: string): Promise<PersistentStorage<SqluiCore.ConnectionQuery>>;
export declare function getSessionsStorage(): Promise<PersistentStorage<SqluiCore.Session>>;
export declare function getFolderItemsStorage(folderId: 'bookmarks' | 'recycleBin' | string): Promise<PersistentStorage<SqluiCore.FolderItem>>;
