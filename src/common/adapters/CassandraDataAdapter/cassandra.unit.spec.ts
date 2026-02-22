import { vi } from "vitest";

const mockExecute = vi.fn();
const mockShutdown = vi.fn().mockResolvedValue(undefined);
const mockConnect = vi.fn().mockImplementation((cb) => cb(null));
const mockGetState = vi.fn().mockReturnValue({
  getConnectedHosts: () => [{ cassandraVersion: "4.0.0" }],
});

vi.mock("cassandra-driver", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    execute: mockExecute,
    shutdown: mockShutdown,
    getState: mockGetState,
    metadata: {
      keyspaces: {
        system: {},
        system_schema: {},
        test_keyspace: {},
      },
    },
  })),
  auth: {
    PlainTextAuthProvider: vi.fn(),
  },
}));

import CassandraDataAdapter from "src/common/adapters/CassandraDataAdapter/index";

describe("CassandraDataAdapter unit", () => {
  let adapter: CassandraDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockImplementation((cb) => cb(null));
    adapter = new CassandraDataAdapter("cassandra://127.0.0.1:9042");
  });

  test("authenticate", async () => {
    await adapter.authenticate();
    expect(mockConnect).toHaveBeenCalled();
    expect(mockShutdown).toHaveBeenCalled();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBe(3);
    const names = databases.map((d) => d.name);
    expect(names).toContain("system");
    expect(names).toContain("system_schema");
    expect(names).toContain("test_keyspace");
  });

  test("getTables", async () => {
    mockExecute.mockResolvedValue({
      rows: [{ name: "artists" }, { name: "albums" }],
    });
    const tables = await adapter.getTables("test_keyspace");
    expect(tables.length).toBe(2);
    expect(tables[0].name).toBe("artists");
    expect(tables[1].name).toBe("albums");
  });

  test("getTables returns empty for no database", async () => {
    const tables = await adapter.getTables();
    expect(tables).toEqual([]);
  });

  test("getColumns", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        { name: "artist_id", type: "int", kind: "partition_key" },
        { name: "name", type: "text", kind: "regular" },
      ],
    });
    const columns = await adapter.getColumns("artists", "test_keyspace");
    expect(columns.length).toBe(2);
    expect(columns[0].name).toBe("artist_id");
    expect(columns[0].type).toBe("int");
    expect(columns[1].name).toBe("name");
    expect(columns[1].type).toBe("text");
  });

  test("execute select", async () => {
    mockExecute.mockResolvedValue({
      rows: [{ artist_id: 1, name: "Test Artist" }],
    });
    const resp = await adapter.execute("SELECT * FROM artists LIMIT 10", "test_keyspace");
    expect(resp.ok).toBe(true);
    expect(resp.raw).toEqual([{ artist_id: 1, name: "Test Artist" }]);
  });

  test("execute error", async () => {
    mockExecute.mockRejectedValue(new Error("Syntax error in CQL query"));
    const resp = await adapter.execute("INVALID CQL", "test_keyspace");
    expect(resp.ok).toBe(false);
    expect(resp.error).toBeDefined();
  });
});
