import { describe, test, expect, vi, beforeEach } from "vitest";

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

let testCounter = 0;

function uniqueSessionId() {
  testCounter++;
  return `test-session-${testCounter}-${Date.now()}`;
}

import { getQueryStorage, getSessionsStorage } from "src/common/PersistentStorage";

describe("Endpoints data persistence", () => {
  beforeEach(() => {
    mockFiles.clear();
  });

  describe("POST /api/query - name persistence", () => {
    test("query name is preserved after add and retrievable via list", async () => {
      const sessionId = uniqueSessionId();
      const queryStorage = await getQueryStorage(sessionId);

      const added = queryStorage.add({ name: "Query 4/20/2026 11:07 AM" });

      expect(added.name).toBe("Query 4/20/2026 11:07 AM");
      expect(added.id).toBeDefined();

      const queries = queryStorage.list();
      expect(queries).toHaveLength(1);
      expect(queries[0].name).toBe("Query 4/20/2026 11:07 AM");
    });

    test("query name persists across storage re-instantiation", async () => {
      const sessionId = uniqueSessionId();
      const queryStorage1 = await getQueryStorage(sessionId);

      queryStorage1.add({ name: "My Test Query" });

      const queryStorage2 = await getQueryStorage(sessionId);
      const queries = queryStorage2.list();
      expect(queries).toHaveLength(1);
      expect(queries[0].name).toBe("My Test Query");
    });

    test("multiple queries each retain their own name", async () => {
      const sessionId = uniqueSessionId();
      const queryStorage = await getQueryStorage(sessionId);

      queryStorage.add({ name: "First Query" });
      queryStorage.add({ name: "Second Query" });

      const queries = queryStorage.list();
      expect(queries).toHaveLength(2);
      const names = queries.map((q: any) => q.name);
      expect(names).toContain("First Query");
      expect(names).toContain("Second Query");
    });
  });

  describe("POST /api/session - name persistence", () => {
    test("session name is preserved after add and retrievable via list", async () => {
      const sessionsStorage = await getSessionsStorage();

      const added = sessionsStorage.add({ name: "New Session 4/20/2026" });

      expect(added.name).toBe("New Session 4/20/2026");
      expect(added.id).toBeDefined();

      const sessions = sessionsStorage.list();
      const found = sessions.find((s: any) => s.id === added.id);
      expect(found).toBeDefined();
      expect(found.name).toBe("New Session 4/20/2026");
    });

    test("session name persists across storage re-instantiation", async () => {
      const sessionsStorage1 = await getSessionsStorage();
      const added = sessionsStorage1.add({ name: "Persistent Session" });

      const sessionsStorage2 = await getSessionsStorage();
      const session = sessionsStorage2.get(added.id);
      expect(session).toBeDefined();
      expect(session.name).toBe("Persistent Session");
    });
  });

  describe("POST /api/query - full field persistence", () => {
    test("query sql, connectionId, databaseId, tableId, and selected are preserved on create", async () => {
      const sessionId = uniqueSessionId();
      const queryStorage = await getQueryStorage(sessionId);

      const added = queryStorage.add({
        name: "My Query",
        sql: "SELECT * FROM users",
        connectionId: "conn-123",
        databaseId: "db-456",
        tableId: "table-789",
        selected: true,
      });

      expect(added.name).toBe("My Query");
      expect(added.sql).toBe("SELECT * FROM users");
      expect(added.connectionId).toBe("conn-123");
      expect(added.databaseId).toBe("db-456");
      expect(added.tableId).toBe("table-789");
      expect(added.selected).toBe(true);

      const queries = queryStorage.list();
      const fetched = queries.find((q: any) => q.id === added.id);
      expect(fetched.name).toBe("My Query");
      expect(fetched.sql).toBe("SELECT * FROM users");
      expect(fetched.connectionId).toBe("conn-123");
      expect(fetched.selected).toBe(true);
    });

    test("query fields persist across storage re-instantiation", async () => {
      const sessionId = uniqueSessionId();
      const queryStorage1 = await getQueryStorage(sessionId);

      queryStorage1.add({
        name: "Persistent Query",
        sql: "aaaa",
        connectionId: "conn-abc",
        selected: true,
      });

      const queryStorage2 = await getQueryStorage(sessionId);
      const queries = queryStorage2.list();
      expect(queries).toHaveLength(1);
      expect(queries[0].name).toBe("Persistent Query");
      expect(queries[0].sql).toBe("aaaa");
      expect(queries[0].connectionId).toBe("conn-abc");
      expect(queries[0].selected).toBe(true);
    });
  });

  describe("PUT endpoints preserve name on update", () => {
    test("query name survives update cycle", async () => {
      const sessionId = uniqueSessionId();
      const queryStorage = await getQueryStorage(sessionId);

      const added = queryStorage.add({ name: "Original Name" });
      const updated = queryStorage.update({ id: added.id, name: "Renamed Query", sql: "SELECT 1" } as any);

      expect(updated.name).toBe("Renamed Query");
      expect(updated.sql).toBe("SELECT 1");

      const fetched = queryStorage.get(added.id);
      expect(fetched.name).toBe("Renamed Query");
    });

    test("session name survives update cycle", async () => {
      const sessionsStorage = await getSessionsStorage();

      const added = sessionsStorage.add({ name: "Original Session" });
      const updated = sessionsStorage.update({ id: added.id, name: "Renamed Session" } as any);

      expect(updated.name).toBe("Renamed Session");

      const fetched = sessionsStorage.get(added.id);
      expect(fetched.name).toBe("Renamed Session");
    });
  });
});
