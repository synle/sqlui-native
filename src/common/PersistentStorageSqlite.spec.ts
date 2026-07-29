import { describe, test, expect, vi, beforeEach, afterAll } from "vitest";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

// Use a counter to generate unique storage names per test, avoiding collisions
let testCounter = 0;

function uniqueName(prefix = "test") {
  testCounter++;
  return `${prefix}_${testCounter}_${Date.now()}`;
}

import { PersistentStorageSqlite } from "src/common/PersistentStorageSqlite";

// Use an in-memory database for all tests
const memDb = new DatabaseSync(":memory:");
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

  describe("prepared statement caching", () => {
    test("prepares each distinct SQL statement only once", () => {
      const table = uniqueName("stmt_cache");
      const storage = new PersistentStorageSqlite(table, "inst", "name");

      // Warm the cache so CREATE TABLE / first-use preparation is not counted below.
      storage.add({ id: "warm", value: 1 });
      storage.get("warm");
      storage.list();
      storage.delete("warm");

      const prepareSpy = vi.spyOn(memDb, "prepare");
      try {
        for (let i = 0; i < 5; i++) {
          storage.add({ id: `row-${i}`, value: i });
          storage.get(`row-${i}`);
          storage.list();
          storage.delete(`row-${i}`);
        }
        expect(prepareSpy).not.toHaveBeenCalled();
      } finally {
        prepareSpy.mockRestore();
      }
    });

    test("re-prepares against a replaced connection instead of reusing stale statements", () => {
      const table = uniqueName("stmt_swap");
      const storage = new PersistentStorageSqlite(table, "inst", "name");
      storage.add({ id: "before-swap", value: 1 });
      expect(storage.get("before-swap").value).toBe(1);

      // Swapping the connection must invalidate cached statements — they belong to the old database.
      const replacement = new DatabaseSync(":memory:");
      PersistentStorageSqlite.setDb(replacement);
      try {
        // The new database starts empty, proving reads hit the replacement rather than a stale statement.
        expect(storage.get("before-swap")).toBeUndefined();

        storage.add({ id: "after-swap", value: 2 });
        expect(storage.get("after-swap").value).toBe(2);
      } finally {
        replacement.close();
        PersistentStorageSqlite.setDb(memDb);
      }

      // The original connection is intact and still holds its own row.
      expect(storage.get("before-swap").value).toBe(1);
    });
  });

  describe("transaction()", () => {
    test("commits all writes made inside the callback", () => {
      const storage = new PersistentStorageSqlite(uniqueName("txn_commit"), "inst", "name");

      const result = PersistentStorageSqlite.transaction(() => {
        storage.add({ id: "a", value: 1 });
        storage.add({ id: "b", value: 2 });
        return "done";
      });

      expect(result).toBe("done");
      expect(storage.list()).toHaveLength(2);
    });

    test("rolls back every write when the callback throws", () => {
      const table = uniqueName("txn_rollback");
      const storage = new PersistentStorageSqlite(table, "inst", "name");
      storage.add({ id: "pre-existing", value: 0 });

      expect(() =>
        PersistentStorageSqlite.transaction(() => {
          storage.add({ id: "a", value: 1 });
          storage.add({ id: "b", value: 2 });
          throw new Error("boom");
        }),
      ).toThrow("boom");

      // The two in-transaction inserts are gone; the earlier committed row survives.
      expect(storage.get("a")).toBeUndefined();
      expect(storage.get("b")).toBeUndefined();
      expect(storage.get("pre-existing").value).toBe(0);
    });

    test("nested calls join the outer transaction instead of opening a second one", () => {
      const storage = new PersistentStorageSqlite(uniqueName("txn_nested"), "inst", "name");

      // SQLite rejects BEGIN inside an active transaction, so a naive implementation throws here.
      expect(() =>
        PersistentStorageSqlite.transaction(() => {
          storage.add({ id: "outer", value: 1 });
          PersistentStorageSqlite.transaction(() => {
            storage.add({ id: "inner", value: 2 });
          });
        }),
      ).not.toThrow();

      expect(storage.list()).toHaveLength(2);
    });

    test("a throw inside a nested call rolls back the outer transaction too", () => {
      const storage = new PersistentStorageSqlite(uniqueName("txn_nested_throw"), "inst", "name");

      expect(() =>
        PersistentStorageSqlite.transaction(() => {
          storage.add({ id: "outer", value: 1 });
          PersistentStorageSqlite.transaction(() => {
            storage.add({ id: "inner", value: 2 });
            throw new Error("inner boom");
          });
        }),
      ).toThrow("inner boom");

      expect(storage.list()).toHaveLength(0);
    });

    test("a caught nested failure discards only the inner writes, and the outer still commits", () => {
      const storage = new PersistentStorageSqlite(uniqueName("txn_nested_caught"), "inst", "name");

      PersistentStorageSqlite.transaction(() => {
        storage.add({ id: "outer-before", value: 1 });

        try {
          PersistentStorageSqlite.transaction(() => {
            storage.add({ id: "inner", value: 2 });
            throw new Error("inner boom");
          });
        } catch (_err) {
          // The caller absorbs the inner failure and carries on.
        }

        storage.add({ id: "outer-after", value: 3 });
      });

      // The inner write is gone; both outer writes survived.
      expect(storage.get("inner")).toBeUndefined();
      expect(storage.get("outer-before").value).toBe(1);
      expect(storage.get("outer-after").value).toBe(3);
    });

    test("a caught set() failure inside an outer transaction does not destroy existing rows", () => {
      const storage = new PersistentStorageSqlite(uniqueName("txn_nested_set"), "inst", "name");
      storage.add({ id: "keep-me", value: 1 });

      PersistentStorageSqlite.transaction(() => {
        try {
          // set() deletes every row before inserting. A failure partway must not leave the table empty
          // just because it happened to run inside an outer transaction.
          storage.set([
            { id: "a", value: 1 },
            { id: null, value: 2 },
          ] as any);
        } catch (_err) {
          // absorbed
        }
      });

      expect(storage.get("keep-me").value).toBe(1);
    });

    test("leaves no transaction open after a rollback, so later writes still commit", () => {
      const storage = new PersistentStorageSqlite(uniqueName("txn_recover"), "inst", "name");

      expect(() =>
        PersistentStorageSqlite.transaction(() => {
          throw new Error("boom");
        }),
      ).toThrow("boom");

      expect(() => PersistentStorageSqlite.transaction(() => storage.add({ id: "after", value: 1 }))).not.toThrow();
      expect(storage.get("after").value).toBe(1);
    });

    test("set() works inside an outer transaction", () => {
      const storage = new PersistentStorageSqlite(uniqueName("txn_set"), "inst", "name");

      expect(() =>
        PersistentStorageSqlite.transaction(() => {
          storage.set([
            { id: "x", value: 1 },
            { id: "y", value: 2 },
          ] as any);
        }),
      ).not.toThrow();

      expect(storage.list()).toHaveLength(2);
    });
  });
});
