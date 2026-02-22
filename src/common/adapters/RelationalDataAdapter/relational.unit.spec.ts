import { vi } from "vitest";

const mockAuthenticate = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);
const mockQuery = vi.fn();
const mockDescribeTable = vi.fn();
const mockGetForeignKeyReferencesForTable = vi.fn().mockResolvedValue([]);

vi.mock("sequelize", () => {
  const SequelizeMock = vi.fn().mockImplementation(() => ({
    authenticate: mockAuthenticate,
    close: mockClose,
    query: mockQuery,
    getQueryInterface: () => ({
      describeTable: mockDescribeTable,
      getForeignKeyReferencesForTable: mockGetForeignKeyReferencesForTable,
    }),
  }));

  return {
    Sequelize: SequelizeMock,
    Options: {},
  };
});

import RelationalDataAdapter from "src/common/adapters/RelationalDataAdapter/index";

describe("RelationalDataAdapter - mysql unit", () => {
  let adapter: RelationalDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new RelationalDataAdapter("mysql://root:password123!@127.0.0.1:3306");
  });

  test("authenticate", async () => {
    await adapter.authenticate();
    expect(mockAuthenticate).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  test("getDatabases", async () => {
    mockQuery.mockResolvedValue([[{ Database: "test_db" }, { Database: "information_schema" }], {}]);
    const databases = await adapter.getDatabases();
    expect(databases.length).toBe(2);
    expect(databases[0].name).toBe("information_schema");
    expect(databases[1].name).toBe("test_db");
  });

  test("getTables", async () => {
    mockQuery.mockResolvedValue([[{ tablename: "artists" }, { tablename: "albums" }], {}]);
    const tables = await adapter.getTables("test_db");
    expect(tables.length).toBe(2);
    expect(tables[0].name).toBe("albums");
    expect(tables[1].name).toBe("artists");
  });

  test("getColumns", async () => {
    mockDescribeTable.mockResolvedValue({
      ArtistId: {
        type: "INT",
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        defaultValue: null,
        comment: null,
      },
      Name: {
        type: "VARCHAR(120)",
        allowNull: true,
        primaryKey: false,
        autoIncrement: false,
        defaultValue: null,
        comment: null,
      },
    });
    const columns = await adapter.getColumns("artists", "test_db");
    expect(columns.length).toBe(2);
    expect(columns[0].name).toBe("ArtistId");
    expect(columns[0].type).toBe("INT");
    expect(columns[1].name).toBe("Name");
    expect(columns[1].type).toBe("VARCHAR(120)");
  });

  test("execute select", async () => {
    mockQuery.mockResolvedValue([
      [{ ArtistId: 1, Name: "Test Artist" }],
      {},
    ]);
    const resp = await adapter.execute("SELECT * FROM artists LIMIT 10", "test_db");
    expect(resp.ok).toBe(true);
    expect(resp.raw).toEqual([{ ArtistId: 1, Name: "Test Artist" }]);
  });

  test("execute error", async () => {
    mockQuery.mockRejectedValue(new Error("SQL syntax error"));
    const resp = await adapter.execute("INVALID SQL", "test_db");
    expect(resp.ok).toBe(false);
    expect(resp.error).toBeDefined();
  });
});

describe("RelationalDataAdapter - postgres unit", () => {
  let adapter: RelationalDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new RelationalDataAdapter("postgres://postgres:password123!@127.0.0.1:5432");
  });

  test("authenticate", async () => {
    await adapter.authenticate();
    expect(mockAuthenticate).toHaveBeenCalled();
  });

  test("getDatabases", async () => {
    mockQuery.mockResolvedValue([[{ database: "postgres" }, { database: "template1" }], {}]);
    const databases = await adapter.getDatabases();
    expect(databases.length).toBe(2);
    expect(databases[0].name).toBe("postgres");
    expect(databases[1].name).toBe("template1");
  });

  test("getTables", async () => {
    mockQuery.mockResolvedValue([[{ tablename: "artists" }], {}]);
    const tables = await adapter.getTables("postgres");
    expect(tables.length).toBe(1);
    expect(tables[0].name).toBe("artists");
  });

  test("getColumns", async () => {
    mockDescribeTable.mockResolvedValue({
      artistid: {
        type: "BIGINT",
        allowNull: false,
        primaryKey: true,
        defaultValue: "nextval(artists_artistid_seq::regclass)",
        comment: null,
        special: [],
      },
      name: {
        type: "CHARACTER(120)",
        allowNull: true,
        primaryKey: false,
        defaultValue: null,
        comment: null,
        special: [],
      },
    });
    const columns = await adapter.getColumns("artists", "postgres");
    expect(columns.length).toBe(2);
    expect(columns[0].name).toBe("artistid");
    expect(columns[0].type).toBe("BIGINT");
    expect(columns[1].name).toBe("name");
    expect(columns[1].type).toBe("CHARACTER(120)");
  });

  test("execute select", async () => {
    mockQuery.mockResolvedValue([
      [{ artistid: 1, name: "Test" }],
      { rowCount: 1 },
    ]);
    const resp = await adapter.execute("SELECT * FROM artists LIMIT 10", "postgres");
    expect(resp.ok).toBe(true);
    expect(resp.raw).toEqual([{ artistid: 1, name: "Test" }]);
  });

  test("execute error", async () => {
    mockQuery.mockRejectedValue(new Error("relation does not exist"));
    const resp = await adapter.execute("SELECT * FROM nonexistent", "postgres");
    expect(resp.ok).toBe(false);
    expect(resp.error).toBeDefined();
  });
});
