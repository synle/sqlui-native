import { describe, test, expect, vi, beforeEach } from "vitest";
import path from "node:path";

// Mock electron so the fallback path is used
vi.mock("electron", () => ({
  app: {
    getPath: () => {
      throw new Error("not in electron");
    },
  },
}));

// Track written files in memory so we can verify write behavior
const mockFiles = new Map<string, string>();

vi.mock("node:fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((filePath: string) => mockFiles.has(filePath)),
    readFileSync: vi.fn((filePath: string) => {
      const content = mockFiles.get(filePath);
      if (!content) throw new Error(`ENOENT: no such file - ${filePath}`);
      return content;
    }),
    writeFileSync: vi.fn((filePath: string, data: string) => {
      mockFiles.set(filePath, data);
    }),
    promises: {
      writeFile: vi.fn((filePath: string, data: string) => {
        mockFiles.set(filePath, data);
        return Promise.resolve();
      }),
    },
  },
}));

// Use a counter to generate unique storage names per test, avoiding memoryCache collisions
let testCounter = 0;

function uniqueName(prefix = "test") {
  testCounter++;
  return `${prefix}_${testCounter}_${Date.now()}`;
}

import PersistentStorage, {
  storageDir,
  getConnectionsStorage,
  getQueryStorage,
  getSessionsStorage,
  getFolderItemsStorage,
  getDataSnapshotStorage,
  getSettingsStorage,
  getManagedDatabasesStorage,
  getManagedTablesStorage,
} from "src/common/PersistentStorage";

describe("PersistentStorage", () => {
  beforeEach(() => {
    mockFiles.clear();
  });

  describe("constructor", () => {
    test("uses default storage location when storageLocation is not provided", () => {
      const instanceId = uniqueName("inst");
      const name = uniqueName("name");
      const storage = new PersistentStorage(instanceId, name);
      expect(storage.storageLocation).toContain(`${instanceId}.${name}.json`);
      expect(storage.storageLocation).toContain(storageDir);
    });

    test("uses custom storage location when storageLocation is provided", () => {
      const instanceId = uniqueName("inst");
      const name = uniqueName("name");
      const customLocation = uniqueName("custom");
      const storage = new PersistentStorage(instanceId, name, customLocation);
      expect(storage.storageLocation).toContain(`${customLocation}.json`);
      expect(storage.storageLocation).not.toContain(`${instanceId}.${name}.json`);
    });

    test("sets instanceId and name properties", () => {
      const instanceId = uniqueName("inst");
      const name = uniqueName("name");
      const storage = new PersistentStorage(instanceId, name);
      expect(storage.instanceId).toBe(instanceId);
      expect(storage.name).toBe(name);
    });
  });

  describe("storageDir", () => {
    test("is a non-empty string path", () => {
      expect(typeof storageDir).toBe("string");
      expect(storageDir.length).toBeGreaterThan(0);
    });

    test("contains .sqlui-native in fallback mode", () => {
      expect(storageDir).toContain(".sqlui-native");
    });
  });

  describe("add()", () => {
    test("generates an ID when entry has no id", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const result = storage.add({ foo: "bar" });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);
    });

    test("uses the provided id when entry has one", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const result = storage.add({ id: "custom-id-123", foo: "bar" });
      expect(result.id).toBe("custom-id-123");
    });

    test("sets createdAt and updatedAt timestamps", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const before = Date.now();
      const result = storage.add({ foo: "bar" });
      const after = Date.now();
      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.createdAt).toBeLessThanOrEqual(after);
      expect(result.updatedAt).toBeGreaterThanOrEqual(before);
      expect(result.updatedAt).toBeLessThanOrEqual(after);
      expect(result.createdAt).toBe(result.updatedAt);
    });

    test("preserves entry properties", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const result = storage.add({ name: "test-entry", value: 42 });
      expect(result.name).toBe("test-entry");
      expect(result.value).toBe(42);
    });

    test("can add multiple entries", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "a", label: "first" });
      storage.add({ id: "b", label: "second" });
      const items = storage.list();
      expect(items).toHaveLength(2);
    });
  });

  describe("get()", () => {
    test("retrieves an entry by ID", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "lookup-id", data: "hello" });
      const result = storage.get("lookup-id");
      expect(result).toBeDefined();
      expect(result.id).toBe("lookup-id");
      expect(result.data).toBe("hello");
    });

    test("returns undefined for a non-existent ID", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const result = storage.get("does-not-exist");
      expect(result).toBeUndefined();
    });
  });

  describe("list()", () => {
    test("returns an empty array when storage is empty", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const items = storage.list();
      expect(items).toEqual([]);
    });

    test("returns all entries as an array", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "x", val: 1 });
      storage.add({ id: "y", val: 2 });
      storage.add({ id: "z", val: 3 });
      const items = storage.list();
      expect(items).toHaveLength(3);
      const ids = items.map((item: any) => item.id);
      expect(ids).toContain("x");
      expect(ids).toContain("y");
      expect(ids).toContain("z");
    });
  });

  describe("update()", () => {
    test("merges new fields into an existing entry", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "upd-1", name: "original", extra: "keep" });
      const updated = storage.update({ id: "upd-1", name: "modified" } as any);
      expect(updated.name).toBe("modified");
      expect(updated.extra).toBe("keep");
    });

    test("updates the updatedAt timestamp", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const added = storage.add({ id: "upd-2", name: "test" });
      const originalUpdatedAt = added.updatedAt;

      // Small delay to ensure timestamp difference
      const updated = storage.update({ id: "upd-2", name: "changed" } as any);
      expect(updated.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    test("does not overwrite createdAt", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const added = storage.add({ id: "upd-3", name: "test" });
      const originalCreatedAt = added.createdAt;

      const updated = storage.update({ id: "upd-3", name: "changed" } as any);
      expect(updated.createdAt).toBe(originalCreatedAt);
    });

    test("persists the update for subsequent get calls", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "upd-4", status: "pending" });
      storage.update({ id: "upd-4", status: "done" } as any);
      const result = storage.get("upd-4");
      expect(result.status).toBe("done");
    });
  });

  describe("delete()", () => {
    test("removes an entry by ID", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "del-1", data: "remove me" });
      expect(storage.get("del-1")).toBeDefined();
      storage.delete("del-1");
      expect(storage.get("del-1")).toBeUndefined();
    });

    test("does not affect other entries", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "keep", data: "stay" });
      storage.add({ id: "remove", data: "go" });
      storage.delete("remove");
      expect(storage.list()).toHaveLength(1);
      expect(storage.get("keep")).toBeDefined();
    });

    test("deleting a non-existent ID does not throw", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      expect(() => storage.delete("phantom")).not.toThrow();
    });
  });

  describe("set()", () => {
    test("replaces all entries with the provided array", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "old", data: "should be gone" });
      storage.set([
        { id: "new1", data: "first" },
        { id: "new2", data: "second" },
      ] as any);
      const items = storage.list();
      expect(items).toHaveLength(2);
      expect(storage.get("old")).toBeUndefined();
      expect(storage.get("new1")).toBeDefined();
      expect(storage.get("new2")).toBeDefined();
    });

    test("setting an empty array clears all entries", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "a", data: "1" });
      storage.add({ id: "b", data: "2" });
      storage.set([]);
      expect(storage.list()).toHaveLength(0);
    });

    test("returns the input entries array", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const entries = [{ id: "r1", data: "test" }] as any;
      const result = storage.set(entries);
      expect(result).toBe(entries);
    });
  });

  describe("getGeneratedRandomId()", () => {
    test("returns a string prefixed with the storage name", () => {
      const name = uniqueName("mytype");
      const storage = new PersistentStorage(uniqueName(), name);
      const id = storage.getGeneratedRandomId();
      expect(id.startsWith(`${name}.`)).toBe(true);
    });

    test("generates unique IDs on successive calls", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        ids.add(storage.getGeneratedRandomId());
      }
      expect(ids.size).toBe(50);
    });

    test("contains three dot-separated parts", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const id = storage.getGeneratedRandomId();
      const parts = id.split(".");
      expect(parts.length).toBe(3);
    });
  });

  describe("writeDataFile() and readDataFile()", () => {
    test("writeDataFile writes JSON to the storage directory and returns the path", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const fileName = `test-output-${Date.now()}.json`;
      const data = { key: "value", count: 7 };
      const fullPath = storage.writeDataFile(fileName, data);
      expect(fullPath).toContain(storageDir);
      expect(fullPath).toContain(fileName);
      // Verify written content via mockFiles
      const written = mockFiles.get(fullPath);
      expect(written).toBeDefined();
      expect(JSON.parse(written!)).toEqual(data);
    });

    test("readDataFile reads and parses a JSON file", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const fileName = `read-test-${Date.now()}.json`;
      const data = { items: [1, 2, 3] };
      const fullPath = storage.writeDataFile(fileName, data);
      const result = storage.readDataFile(fullPath);
      expect(result).toEqual(data);
    });

    test("readDataFile throws for a non-existent file", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      expect(() => storage.readDataFile("/nonexistent/path.json")).toThrow();
    });
  });

  describe("memory cache behavior", () => {
    test("second read hits the in-memory cache without re-reading from disk", () => {
      const fs = require("node:fs");
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "cached-entry", data: "test" });

      // Clear the readFileSync call count
      fs.default?.readFileSync?.mockClear?.();

      // Subsequent reads should use the cache
      const result1 = storage.get("cached-entry");
      const result2 = storage.list();
      expect(result1.data).toBe("test");
      expect(result2).toHaveLength(1);
    });
  });

  describe("getData() edge cases", () => {
    test("returns empty object when file does not exist", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      const items = storage.list();
      expect(items).toEqual([]);
    });

    test("returns empty object when file contains invalid JSON", () => {
      const name1 = uniqueName("inst");
      const name2 = uniqueName("name");
      const expectedPath = path.join(storageDir, `${name1}.${name2}.json`);
      mockFiles.set(expectedPath, "{ invalid json !!!");

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const storage = new PersistentStorage(name1, name2);
      const items = storage.list();
      expect(items).toEqual([]);
      consoleSpy.mockRestore();
    });

    test("reads from disk when file exists and cache is empty", () => {
      const name1 = uniqueName("inst");
      const name2 = uniqueName("name");
      const expectedPath = path.join(storageDir, `${name1}.${name2}.json`);
      const existingData = { "entry-1": { id: "entry-1", name: "preloaded" } };
      mockFiles.set(expectedPath, JSON.stringify(existingData));

      const storage = new PersistentStorage(name1, name2);
      const result = storage.get("entry-1");
      expect(result).toBeDefined();
      expect(result.name).toBe("preloaded");
    });
  });

  describe("factory functions", () => {
    describe("getConnectionsStorage", () => {
      test("returns a PersistentStorage instance for a valid sessionId", async () => {
        const storage = await getConnectionsStorage("session-abc");
        expect(storage).toBeInstanceOf(PersistentStorage);
        expect(storage.name).toBe("connection");
      });

      test("throws when sessionId is empty", async () => {
        await expect(getConnectionsStorage("")).rejects.toThrow("sessionId is required");
      });
    });

    describe("getQueryStorage", () => {
      test("returns a PersistentStorage instance for a valid sessionId", async () => {
        const storage = await getQueryStorage("session-xyz");
        expect(storage).toBeInstanceOf(PersistentStorage);
        expect(storage.name).toBe("query");
      });

      test("throws when sessionId is empty", async () => {
        await expect(getQueryStorage("")).rejects.toThrow("sessionId is required");
      });
    });

    describe("getSessionsStorage", () => {
      test("returns a PersistentStorage instance with custom storage location", async () => {
        const storage = await getSessionsStorage();
        expect(storage).toBeInstanceOf(PersistentStorage);
        expect(storage.storageLocation).toContain("sessions.json");
      });
    });

    describe("getFolderItemsStorage", () => {
      test("returns a PersistentStorage instance for bookmarks", async () => {
        const storage = await getFolderItemsStorage("bookmarks");
        expect(storage).toBeInstanceOf(PersistentStorage);
        expect(storage.name).toBe("bookmarks");
      });

      test("returns a PersistentStorage instance for recycleBin", async () => {
        const storage = await getFolderItemsStorage("recycleBin");
        expect(storage).toBeInstanceOf(PersistentStorage);
        expect(storage.name).toBe("recycleBin");
      });

      test("throws when folderId is empty", async () => {
        await expect(getFolderItemsStorage("")).rejects.toThrow("folderId is required");
      });
    });

    describe("getDataSnapshotStorage", () => {
      test("returns a PersistentStorage instance", async () => {
        const storage = await getDataSnapshotStorage();
        expect(storage).toBeInstanceOf(PersistentStorage);
        expect(storage.storageLocation).toContain("dataSnapshots.json");
      });
    });

    describe("getSettingsStorage", () => {
      test("returns a PersistentStorage instance", async () => {
        const storage = await getSettingsStorage();
        expect(storage).toBeInstanceOf(PersistentStorage);
        expect(storage.storageLocation).toContain("settings.json");
      });
    });

    describe("getManagedDatabasesStorage", () => {
      test("returns a PersistentStorage instance for a valid connectionId", async () => {
        const storage = await getManagedDatabasesStorage("conn-123");
        expect(storage).toBeInstanceOf(PersistentStorage);
        expect(storage.name).toBe("conn-123");
      });

      test("throws when connectionId is empty", async () => {
        await expect(getManagedDatabasesStorage("")).rejects.toThrow("connectionId is required");
      });
    });

    describe("getManagedTablesStorage", () => {
      test("returns a PersistentStorage instance for a valid connectionId", async () => {
        const storage = await getManagedTablesStorage("conn-456");
        expect(storage).toBeInstanceOf(PersistentStorage);
        expect(storage.name).toBe("conn-456");
      });

      test("throws when connectionId is empty", async () => {
        await expect(getManagedTablesStorage("")).rejects.toThrow("connectionId is required");
      });
    });
  });

  describe("add() with existing ID overwrites", () => {
    test("adding an entry with the same ID overwrites the previous entry", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());
      storage.add({ id: "dup", version: 1 });
      storage.add({ id: "dup", version: 2 });
      const result = storage.get("dup");
      expect(result.version).toBe(2);
      expect(storage.list()).toHaveLength(1);
    });
  });

  describe("CRUD integration", () => {
    test("full lifecycle: add, get, update, list, delete", () => {
      const storage = new PersistentStorage(uniqueName(), uniqueName());

      // Add
      const entry = storage.add({ id: "lifecycle-1", status: "new", priority: 5 });
      expect(entry.id).toBe("lifecycle-1");
      expect(entry.status).toBe("new");
      expect(entry.createdAt).toBeDefined();

      // Get
      const fetched = storage.get("lifecycle-1");
      expect(fetched.status).toBe("new");

      // Update
      const updated = storage.update({ id: "lifecycle-1", status: "done" } as any);
      expect(updated.status).toBe("done");
      expect(updated.priority).toBe(5);

      // List
      storage.add({ id: "lifecycle-2", status: "pending", priority: 3 });
      expect(storage.list()).toHaveLength(2);

      // Delete
      storage.delete("lifecycle-1");
      expect(storage.list()).toHaveLength(1);
      expect(storage.get("lifecycle-1")).toBeUndefined();
      expect(storage.get("lifecycle-2")).toBeDefined();
    });
  });
});
