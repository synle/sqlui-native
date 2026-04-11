import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";

// Shared state must be created via vi.hoisted so it's available inside hoisted vi.mock factories
const { mockFiles, mockDirs, renamedFiles } = vi.hoisted(() => ({
  mockFiles: new Map<string, string>(),
  mockDirs: new Set<string>(),
  renamedFiles: [] as Array<{ from: string; to: string }>,
}));

// Mock electron so the fallback path is used
vi.mock("electron", () => ({
  app: {
    getPath: () => {
      throw new Error("not in electron");
    },
  },
}));

vi.mock("node:fs", () => ({
  default: {
    mkdirSync: vi.fn((dir: string) => {
      mockDirs.add(dir);
    }),
    existsSync: vi.fn((filePath: string) => mockFiles.has(filePath)),
    readFileSync: vi.fn((filePath: string) => {
      const content = mockFiles.get(filePath);
      if (!content) throw new Error(`ENOENT: no such file - ${filePath}`);
      return content;
    }),
    writeFileSync: vi.fn((filePath: string, data: string) => {
      mockFiles.set(filePath, data);
    }),
    readdirSync: vi.fn((dir: string) => {
      const prefix = dir.endsWith("/") ? dir : dir + "/";
      const results: string[] = [];
      for (const key of mockFiles.keys()) {
        if (key.startsWith(prefix)) {
          const relative = key.slice(prefix.length);
          // Only return direct children (no nested paths)
          if (!relative.includes("/")) {
            results.push(relative);
          }
        }
      }
      return results;
    }),
    renameSync: vi.fn((from: string, to: string) => {
      renamedFiles.push({ from, to });
      const content = mockFiles.get(from);
      if (content !== undefined) {
        mockFiles.set(to, content);
        mockFiles.delete(from);
      }
    }),
    promises: {
      writeFile: vi.fn((filePath: string, data: string) => {
        mockFiles.set(filePath, data);
        return Promise.resolve();
      }),
    },
  },
}));

import { PersistentStorageSqlite } from "src/common/PersistentStorageSqlite";
import { storageDir } from "src/common/PersistentStorageJsonFile";
import {
  runMigration,
  getStorageVersion,
  getDbFilePath,
  dbFileExists,
  CURRENT_STORAGE_VERSION,
  STORAGE_VERSION_ID,
} from "src/common/PersistentStorageMigration";

// Use in-memory database for tests
let memDb: InstanceType<typeof Database>;

beforeEach(() => {
  mockFiles.clear();
  mockDirs.clear();
  renamedFiles.length = 0;
  memDb = new Database(":memory:");
  PersistentStorageSqlite.setDb(memDb);
});

afterEach(() => {
  PersistentStorageSqlite.closeDb();
});

/** Helper to simulate the SQLite DB file existing on disk. */
function simulateDbFileExists() {
  mockFiles.set(getDbFilePath(), "sqlite-db-placeholder");
}

describe("PersistentStorageMigration", () => {
  describe("dbFileExists", () => {
    test("returns false when no DB file on disk", () => {
      expect(dbFileExists()).toBe(false);
    });

    test("returns true when DB file exists", () => {
      simulateDbFileExists();
      expect(dbFileExists()).toBe(true);
    });
  });

  describe("getStorageVersion", () => {
    test("returns 0 when DB file does not exist", () => {
      expect(getStorageVersion()).toBe(0);
    });

    test("returns 0 when DB file exists but no version entry", () => {
      simulateDbFileExists();
      expect(getStorageVersion()).toBe(0);
    });

    test("returns the stored version when DB file exists", () => {
      simulateDbFileExists();
      const settingStorage = new PersistentStorageSqlite<any>("setting", "settings", "settings", "settings");
      settingStorage.add({ id: STORAGE_VERSION_ID, version: 1 });
      expect(getStorageVersion()).toBe(1);
    });
  });

  describe("runMigration", () => {
    test("no-ops when DB exists and already at current version", () => {
      simulateDbFileExists();
      const settingStorage = new PersistentStorageSqlite<any>("setting", "settings", "settings", "settings");
      settingStorage.add({ id: STORAGE_VERSION_ID, version: CURRENT_STORAGE_VERSION });

      runMigration();
      // No files should be renamed
      expect(renamedFiles).toHaveLength(0);
    });

    test("sets version on fresh install with no JSON files and no DB", () => {
      runMigration();
      // After migration, version should be set (DB was created by setStorageVersion)
      simulateDbFileExists(); // simulate it now existing after creation
      expect(getStorageVersion()).toBe(CURRENT_STORAGE_VERSION);
    });

    test("migrates settings.json to setting table", () => {
      const settingsData = {
        "app-settings": { id: "app-settings", darkMode: "dark", animationMode: "on" },
      };
      mockFiles.set(`${storageDir}/settings.json`, JSON.stringify(settingsData));

      runMigration();

      const settingStorage = new PersistentStorageSqlite<any>("setting", "migration", "migration");
      const entry = settingStorage.get("app-settings");
      expect(entry).toBeDefined();
      expect(entry.darkMode).toBe("dark");
      simulateDbFileExists();
      expect(getStorageVersion()).toBe(CURRENT_STORAGE_VERSION);
    });

    test("migrates connection files to connection table", () => {
      const connectionData = {
        "connection.123.456": { id: "connection.123.456", name: "My DB", connection: "mysql://localhost" },
      };
      mockFiles.set(`${storageDir}/session-abc.connection.json`, JSON.stringify(connectionData));

      runMigration();

      const connStorage = new PersistentStorageSqlite<any>("connection", "migration", "migration");
      const entry = connStorage.get("connection.123.456");
      expect(entry).toBeDefined();
      expect(entry.name).toBe("My DB");
    });

    test("migrates sessions.json to session table", () => {
      const sessionsData = {
        "session.1.2": { id: "session.1.2", name: "My Session" },
      };
      mockFiles.set(`${storageDir}/sessions.json`, JSON.stringify(sessionsData));

      runMigration();

      const sessionStorage = new PersistentStorageSqlite<any>("session", "migration", "migration");
      const entry = sessionStorage.get("session.1.2");
      expect(entry).toBeDefined();
      expect(entry.name).toBe("My Session");
    });

    test("migrates folder items to folder_item table", () => {
      const folderData = {
        "bookmark.1": { id: "bookmark.1", type: "Connection", data: {} },
      };
      mockFiles.set(`${storageDir}/folders.bookmarks.json`, JSON.stringify(folderData));

      runMigration();

      const folderStorage = new PersistentStorageSqlite<any>("folder_item", "migration", "migration");
      const entry = folderStorage.get("bookmark.1");
      expect(entry).toBeDefined();
      expect(entry.type).toBe("Connection");
    });

    test("migrates cache files to cached_* tables", () => {
      const cacheData = {
        "conn-1": { id: "conn-1", data: [{ name: "db1" }], timestamp: 123 },
      };
      mockFiles.set(`${storageDir}/cache.databases.json`, JSON.stringify(cacheData));

      runMigration();

      const cacheStorage = new PersistentStorageSqlite<any>("cached_database", "migration", "migration");
      const entry = cacheStorage.get("conn-1");
      expect(entry).toBeDefined();
      expect(entry.timestamp).toBe(123);
    });

    test("moves migrated files to backup directory", () => {
      const settingsData = { "app-settings": { id: "app-settings", darkMode: "dark" } };
      mockFiles.set(`${storageDir}/settings.json`, JSON.stringify(settingsData));

      runMigration();

      expect(renamedFiles.length).toBeGreaterThan(0);
      const settingsRename = renamedFiles.find((r) => r.from.includes("settings.json"));
      expect(settingsRename).toBeDefined();
      expect(settingsRename!.to).toContain("backup");
    });

    test("creates backup directory", () => {
      mockFiles.set(`${storageDir}/settings.json`, JSON.stringify({ s: { id: "s" } }));

      runMigration();

      expect(mockDirs.has(`${storageDir}/backup`)).toBe(true);
    });

    test("skips unknown JSON files", () => {
      mockFiles.set(`${storageDir}/unknown-file.json`, JSON.stringify({}));
      mockFiles.set(`${storageDir}/settings.json`, JSON.stringify({ s: { id: "s" } }));

      runMigration();

      // Only settings.json should be moved, not unknown-file.json
      const unknownRename = renamedFiles.find((r) => r.from.includes("unknown-file.json"));
      expect(unknownRename).toBeUndefined();
    });

    test("handles multiple files across different tables", () => {
      mockFiles.set(`${storageDir}/session-a.connection.json`, JSON.stringify({ c1: { id: "c1", name: "Conn1" } }));
      mockFiles.set(`${storageDir}/session-a.query.json`, JSON.stringify({ q1: { id: "q1", sql: "SELECT 1" } }));
      mockFiles.set(`${storageDir}/settings.json`, JSON.stringify({ "app-settings": { id: "app-settings", darkMode: "light" } }));

      runMigration();

      const connStorage = new PersistentStorageSqlite<any>("connection", "migration", "migration");
      const queryStorage = new PersistentStorageSqlite<any>("query", "migration", "migration");
      const settingStorage = new PersistentStorageSqlite<any>("setting", "migration", "migration");

      expect(connStorage.get("c1")).toBeDefined();
      expect(queryStorage.get("q1")).toBeDefined();
      expect(settingStorage.get("app-settings")).toBeDefined();
      expect(renamedFiles).toHaveLength(3);
      simulateDbFileExists();
      expect(getStorageVersion()).toBe(CURRENT_STORAGE_VERSION);
    });
  });
});
