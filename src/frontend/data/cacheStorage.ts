import type { Persister, PersistedClient } from "@tanstack/react-query-persist-client";

const DB_NAME = "sqlui-native-cache";
const DB_VERSION = 1;
const STORE_NAME = "queryCache";
const CACHE_KEY = "reactQueryClientCache";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function idbSet<T>(db: IDBDatabase, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function createIndexedDBPersister(): Persister {
  return {
    async persistClient(client: PersistedClient): Promise<void> {
      try {
        const db = await openDB();
        await idbSet(db, CACHE_KEY, client);
        db.close();
      } catch {
        // Silently ignore persist errors
      }
    },

    async restoreClient(): Promise<PersistedClient | undefined> {
      try {
        const db = await openDB();
        const client = await idbGet<PersistedClient>(db, CACHE_KEY);
        db.close();
        return client;
      } catch {
        return undefined;
      }
    },

    async removeClient(): Promise<void> {
      try {
        const db = await openDB();
        await idbDelete(db, CACHE_KEY);
        db.close();
      } catch {
        // Silently ignore removal errors
      }
    },
  };
}

/** No-op persister used in test environments to avoid IndexedDB side effects. */
function createNoopPersister(): Persister {
  return {
    persistClient: () => Promise.resolve(),
    restoreClient: () => Promise.resolve(undefined),
    removeClient: () => Promise.resolve(),
  };
}

const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.VITEST === "true");

export const persister: Persister = isTestEnv ? createNoopPersister() : createIndexedDBPersister();
