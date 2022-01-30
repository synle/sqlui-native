const fs = require('fs');
const path = require('path');
const homedir = require('os').homedir();
import { SqluiCore } from '../../typings';

// this section of the api is caches in memory
interface StorageContent {
  [index: string]: any;
}

interface StorageEntry {
  id: string;
  [index: string]: any;
}

const baseDir = path.join(homedir, '.sqlui-native');
try {
  fs.mkdirSync(baseDir);
} catch (err) {
  //@ts-ignore
}

export class PersistentStorage<T extends StorageEntry> {
  instanceId: string;
  name: string;
  storageLocation: string;

  constructor(instanceId: string, name: string) {
    this.instanceId = instanceId;
    this.name = name;
    this.storageLocation = path.join(baseDir, `${this.instanceId}.${this.name}.json`);
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
    const newId = `${this.name}.${Date.now()}.${Math.floor(Math.random() * 10000000000000000)}`;

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
