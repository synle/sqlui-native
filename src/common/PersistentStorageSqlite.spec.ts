import { describe, test, expect, vi, beforeEach, afterAll } from "vitest";
import Database from "better-sqlite3";
import path from "node:path";

// Mock electron so the fallback path is used
vi.mock("electron", () => ({
  app: {
    getPath: () => {
      throw new Error("not in electron");
    },
  },
}));

// Use a counter to generate unique storage names per test, avoiding collisions
let testCounter = 0;

function uniqueName(prefix = "test") {
  testCounter++;
  return `${prefix}_${testCounter}_${Date.now()}`;
}

import { PersistentStorageSqlite } from "src/common/PersistentStorageSqlite";

// Use an in-memory database for all tests
const memDb = new Database(":memory:");
PersistentStorageSqlite.setDb(memDb);

afterAll(() => {
  PersistentStorageSqlite.closeDb();
});

describe("PersistentStorageSqlite", () => {
  describe("constructor", () => {
    test("sets table, instanceId, and name properties", () => {
      const storage = new PersistentStorageSqlite("my_table", "inst1", "name1");
      expect(storage.table).toBe("my_table");
      expect(storage.instanceId).toBe("inst1");
      expect(storage.name).toBe("name1");
    });

    test("computes storageLocation for interface compat", () => {
      const storage = new PersistentStorageSqlite("my_table", "inst1", "name1");
      expect(storage.storageLocation).toContain("inst1.name1.json");
    });

    test("uses custom storageLocation when provided", () => {
      const storage = new PersistentStorageSqlite("my_table", "inst1", "name1", "custom");
      expect(storage.storageLocation).toContain("custom.json");
      expect(storage.storageLocation).not.toContain("inst1.name1.json");
    });
  });

  describe("add()", () => {
    test("generates an ID when entry has no id", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      const result = storage.add({ foo: "bar" });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);
    });

    test("uses the provided id when entry has one", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      const result = storage.add({ id: "custom-id-123", foo: "bar" });
      expect(result.id).toBe("custom-id-123");
    });

    test("sets createdAt and updatedAt timestamps", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
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
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      const result = storage.add({ name: "test-entry", value: 42 });
      expect(result.name).toBe("test-entry");
      expect(result.value).toBe(42);
    });

    test("can add multiple entries", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      storage.add({ id: "a", label: "first" });
      storage.add({ id: "b", label: "second" });
      const items = storage.list();
      expect(items).toHaveLength(2);
    });

    test("does not duplicate id inside data column", () => {
      const tbl = uniqueName("tbl");
      const storage = new PersistentStorageSqlite(tbl, uniqueName(), uniqueName());
      storage.add({ id: "no-dup", foo: "bar" });

      // Read raw data from SQLite to verify id is not in JSON
      const row = memDb.prepare(`SELECT data FROM "${tbl}" WHERE id = ?`).get("no-dup") as { data: string };
      const parsed = JSON.parse(row.data);
      expect(parsed.id).toBeUndefined();
      expect(parsed.foo).toBe("bar");
    });
  });

  describe("get()", () => {
    test("retrieves an entry by ID", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      storage.add({ id: "lookup-id", data: "hello" });
      const result = storage.get("lookup-id");
      expect(result).toBeDefined();
      expect(result.id).toBe("lookup-id");
      expect(result.data).toBe("hello");
    });

    test("returns undefined for a non-existent ID", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      const result = storage.get("does-not-exist");
      expect(result).toBeUndefined();
    });

    test("re-injects id from column into returned object", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      storage.add({ id: "injected", value: 99 });
      const result = storage.get("injected");
      expect(result.id).toBe("injected");
      expect(result.value).toBe(99);
    });
  });

  describe("list()", () => {
    test("returns an empty array when storage is empty", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      const items = storage.list();
      expect(items).toEqual([]);
    });

    test("returns all entries as an array", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
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

    test("re-injects id into each returned entry", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      storage.add({ id: "list-a", val: 1 });
      storage.add({ id: "list-b", val: 2 });
      const items = storage.list();
      for (const item of items) {
        expect(item.id).toBeDefined();
        expect(typeof item.id).toBe("string");
      }
    });
  });

  describe("update()", () => {
    test("merges new fields into an existing entry", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      storage.add({ id: "upd-1", name: "original", extra: "keep" });
      const updated = storage.update({ id: "upd-1", name: "modified" } as any);
      expect(updated.name).toBe("modified");
      expect(updated.extra).toBe("keep");
    });

    test("updates the updatedAt timestamp", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      const added = storage.add({ id: "upd-2", name: "test" });
      const originalUpdatedAt = added.updatedAt;

      const updated = storage.update({ id: "upd-2", name: "changed" } as any);
      expect(updated.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    test("does not overwrite createdAt", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      const added = storage.add({ id: "upd-3", name: "test" });
      const originalCreatedAt = added.createdAt;

      const updated = storage.update({ id: "upd-3", name: "changed" } as any);
      expect(updated.createdAt).toBe(originalCreatedAt);
    });

    test("persists the update for subsequent get calls", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      storage.add({ id: "upd-4", status: "pending" });
      storage.update({ id: "upd-4", status: "done" } as any);
      const result = storage.get("upd-4");
      expect(result.status).toBe("done");
    });
  });

  describe("delete()", () => {
    test("removes an entry by ID", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      storage.add({ id: "del-1", data: "remove me" });
      expect(storage.get("del-1")).toBeDefined();
      storage.delete("del-1");
      expect(storage.get("del-1")).toBeUndefined();
    });

    test("does not affect other entries", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      storage.add({ id: "keep", data: "stay" });
      storage.add({ id: "remove", data: "go" });
      storage.delete("remove");
      expect(storage.list()).toHaveLength(1);
      expect(storage.get("keep")).toBeDefined();
    });

    test("deleting a non-existent ID does not throw", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      expect(() => storage.delete("phantom")).not.toThrow();
    });
  });

  describe("set()", () => {
    test("replaces all entries with the provided array", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
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
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      storage.add({ id: "a", data: "1" });
      storage.add({ id: "b", data: "2" });
      storage.set([]);
      expect(storage.list()).toHaveLength(0);
    });

    test("returns the input entries array", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      const entries = [{ id: "r1", data: "test" }] as any;
      const result = storage.set(entries);
      expect(result).toBe(entries);
    });
  });

  describe("getGeneratedRandomId()", () => {
    test("returns a string prefixed with the storage name", () => {
      const name = uniqueName("mytype");
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), name);
      const id = storage.getGeneratedRandomId();
      expect(id.startsWith(`${name}.`)).toBe(true);
    });

    test("generates unique IDs on successive calls", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        ids.add(storage.getGeneratedRandomId());
      }
      expect(ids.size).toBe(50);
    });

    test("contains three dot-separated parts", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      const id = storage.getGeneratedRandomId();
      const parts = id.split(".");
      expect(parts.length).toBe(3);
    });
  });

  describe("cross-instance table isolation", () => {
    test("two instances with different tables do not see each other's data", () => {
      const storageA = new PersistentStorageSqlite(uniqueName("tbl_a"), uniqueName(), uniqueName());
      const storageB = new PersistentStorageSqlite(uniqueName("tbl_b"), uniqueName(), uniqueName());

      storageA.add({ id: "only-in-a", value: 1 });
      storageB.add({ id: "only-in-b", value: 2 });

      expect(storageA.get("only-in-a")).toBeDefined();
      expect(storageA.get("only-in-b")).toBeUndefined();
      expect(storageB.get("only-in-b")).toBeDefined();
      expect(storageB.get("only-in-a")).toBeUndefined();

      expect(storageA.list()).toHaveLength(1);
      expect(storageB.list()).toHaveLength(1);
    });
  });

  describe("add() with existing ID overwrites", () => {
    test("adding an entry with the same ID overwrites the previous entry", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());
      storage.add({ id: "dup", version: 1 });
      storage.add({ id: "dup", version: 2 });
      const result = storage.get("dup");
      expect(result.version).toBe(2);
      expect(storage.list()).toHaveLength(1);
    });
  });

  describe("CRUD integration", () => {
    test("full lifecycle: add, get, update, list, delete", () => {
      const storage = new PersistentStorageSqlite(uniqueName("tbl"), uniqueName(), uniqueName());

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
