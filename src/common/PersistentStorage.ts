import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { getGeneratedRandomId } from 'src/common/utils/commonUtils';
import { SqluiCore } from 'typings';

const homedir = require('os').homedir();

// this section of the api is caches in memory
type StorageContent = {
  [index: string]: any;
};

type StorageEntry = {
  id: string;
  [index: string]: any;
};

let baseDir: string;
try {
  // electron path
  baseDir = path.join(app.getPath('appData'), 'sqlui-native');
  try {
    fs.mkdirSync(baseDir);
  } catch (err) {}
} catch (err) {
  // fall back for mocked server
  baseDir = path.join(homedir, '.sqlui-native');
  try {
    fs.mkdirSync(baseDir);
  } catch (err) {}
}
console.log('baseDir', baseDir);

export const storageDir = baseDir;

export class PersistentStorage<T extends StorageEntry> {
  instanceId: string;
  name: string;
  storageLocation: string;

  constructor(instanceId: string, name: string, storageLocation?: string) {
    this.instanceId = instanceId;
    this.name = name;
    if (storageLocation) {
      this.storageLocation = path.join(baseDir, `${storageLocation}.json`);
    } else {
      this.storageLocation = path.join(baseDir, `${this.instanceId}.${this.name}.json`);
    }
  }

  private getData(): StorageContent {
    try {
      return JSON.parse(
        fs.readFileSync(this.storageLocation, { encoding: 'utf8', flag: 'r' }).trim(),
      );
    } catch (err) {
      return {};
    }
  }

  private setData(toSave: StorageContent) {
    fs.writeFileSync(this.storageLocation, JSON.stringify(toSave, null, 2));
  }

  add<K>(entry: K): T {
    const newId = getGeneratedRandomId(`${this.name}`);

    const caches = this.getData();
    caches[newId] = {
      id: newId,
      ...entry,
    };

    this.setData(caches);

    return caches[newId];
  }

  update(entry: T): T {
    const caches = this.getData();
    caches[entry.id] = {
      ...caches[entry.id],
      ...entry,
    };

    this.setData(caches);

    return caches[entry.id];
  }

  set(entries: T[]): T[] {
    const caches: StorageContent = {};

    for (const entry of entries) {
      caches[entry.id] = entry;
    }

    this.setData(caches);

    return entries;
  }

  list(): T[] {
    const caches = this.getData();
    return Object.values(caches);
  }

  get(id: string): T {
    const caches = this.getData();
    return caches[id];
  }

  delete(id: string) {
    const caches = this.getData();
    delete caches[id];
    this.setData(caches);
  }
}

export default PersistentStorage;

export async function getConnectionsStorage(sessionId: string) {
  return await new PersistentStorage<SqluiCore.ConnectionProps>(sessionId, 'connection');
}

export async function getQueryStorage(sessionId: string) {
  return await new PersistentStorage<SqluiCore.ConnectionQuery>(sessionId, 'query');
}

export async function getSessionsStorage() {
  return await new PersistentStorage<SqluiCore.Session>('session', 'session', 'sessions');
}

export async function getFolderItemsStorage(folderId: 'bookmarks' | 'recycleBin' | string) {
  return await new PersistentStorage<SqluiCore.FolderItem>('folders', folderId);
}
