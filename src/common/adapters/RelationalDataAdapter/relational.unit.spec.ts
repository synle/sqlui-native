import { vi } from "vitest";

const mockPoolQuery = vi.fn();
const mockConnQuery = vi.fn();
const mockEnd = vi.fn().mockResolvedValue(undefined);
const mockRelease = vi.fn();

vi.mock("mysql2/promise", () => ({
  default: {
    createPool: vi.fn().mockImplementation(() => ({
      query: mockPoolQuery,
      getConnection: vi.fn().mockResolvedValue({
        query: mockConnQuery,
        release: mockRelease,
      }),
      end: mockEnd,
    })),
  },
}));

import MySQLDataAdapter from "src/common/adapters/RelationalDataAdapter/mysql/index";

describe("MySQLDataAdapter - unit", () => {
  let adapter: MySQLDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new MySQLDataAdapter("mysql://root:password123!@127.0.0.1:3306");
  });

  afterEach(async () => {
    await adapter.disconnect();
    expect(mockEnd).toHaveBeenCalled();
  });

  test("authenticate", async () => {
    mockPoolQuery.mockResolvedValue([[], []]);
    await adapter.authenticate();
    expect(mockPoolQuery).toHaveBeenCalledWith("SELECT 1");
  });

  test("getDatabases", async () => {
    mockPoolQuery.mockResolvedValue([[{ Database: "test_db" }, { Database: "app_db" }], []]);
    const databases = await adapter.getDatabases();
    expect(databases.length).toBe(2);
    expect(databases[0].name).toBe("app_db");
    expect(databases[1].name).toBe("test_db");
  });

  test("getTables", async () => {
    mockPoolQuery.mockResolvedValue([[{ tablename: "artists" }, { tablename: "albums" }], []]);
    const tables = await adapter.getTables("test_db");
    expect(tables.length).toBe(2);
    expect(tables[0].name).toBe("albums");
    expect(tables[1].name).toBe("artists");
  });

  test("getColumns", async () => {
    // first call: USE database, second: SHOW FULL COLUMNS, third: FK query
    mockConnQuery
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([
        [
          {
            Field: "ArtistId",
            Type: "INT",
            Null: "NO",
            Key: "PRI",
            Default: null,
            Extra: "auto_increment",
            Comment: null,
          },
          {
            Field: "Name",
            Type: "VARCHAR(120)",
            Null: "YES",
            Key: "",
            Default: null,
            Extra: "",
            Comment: null,
          },
        ],
        [],
      ])
      .mockResolvedValueOnce([[], []]);
    const columns = await adapter.getColumns("artists", "test_db");
    expect(columns.length).toBe(2);
    expect(columns[0].name).toBe("ArtistId");
    expect(columns[0].type).toBe("INT");
    expect(columns[0].primaryKey).toBe(true);
    expect(columns[1].name).toBe("Name");
    expect(columns[1].type).toBe("VARCHAR(120)");
  });

  test("execute select", async () => {
    // first call: USE database, second: the actual query
    mockConnQuery.mockResolvedValueOnce([[], []]).mockResolvedValueOnce([[{ ArtistId: 1, Name: "Test Artist" }], []]);
    const resp = await adapter.execute("SELECT * FROM artists LIMIT 10", "test_db");
    expect(resp.ok).toBe(true);
    expect(resp.raw).toEqual([{ ArtistId: 1, Name: "Test Artist" }]);
  });

  test("execute error", async () => {
    // first call: USE database succeeds, second: query fails
    mockConnQuery.mockResolvedValueOnce([[], []]).mockRejectedValueOnce(new Error("SQL syntax error"));
    const resp = await adapter.execute("INVALID SQL", "test_db");
    expect(resp.ok).toBe(false);
    expect(resp.error).toBeDefined();
  });
});

const mockPgConnect = vi.fn().mockResolvedValue(undefined);
const mockPgQuery = vi.fn();
const mockPgEnd = vi.fn().mockResolvedValue(undefined);

vi.mock("pg", () => ({
  default: {
    Client: vi.fn().mockImplementation(() => ({
      connect: mockPgConnect,
      query: mockPgQuery,
      end: mockPgEnd,
    })),
  },
}));

import PostgresDataAdapter from "src/common/adapters/RelationalDataAdapter/postgres/index";

describe("PostgresDataAdapter - unit", () => {
  let adapter: PostgresDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new PostgresDataAdapter("postgres://postgres:password123!@127.0.0.1:5432");
  });

  afterEach(async () => {
    await adapter.disconnect();
    expect(mockPgEnd).toHaveBeenCalled();
  });

  test("authenticate", async () => {
    mockPgQuery.mockResolvedValue({ rows: [{ "?column?": 1 }] });
    await adapter.authenticate();
    expect(mockPgQuery).toHaveBeenCalledWith("SELECT 1");
  });

  test("getDatabases", async () => {
    mockPgQuery.mockResolvedValue({ rows: [{ database: "postgres" }, { database: "app_db" }] });
    const databases = await adapter.getDatabases();
    expect(databases.length).toBe(2);
    expect(databases[0].name).toBe("app_db");
    expect(databases[1].name).toBe("postgres");
  });

  test("getTables", async () => {
    mockPgQuery.mockResolvedValue({ rows: [{ tablename: "artists" }] });
    const tables = await adapter.getTables("postgres");
    expect(tables.length).toBe(1);
    expect(tables[0].name).toBe("artists");
  });

  test("getColumns", async () => {
    mockPgQuery
      .mockResolvedValueOnce({
        rows: [
          {
            name: "artistid",
            type: "bigint",
            is_nullable: "NO",
            column_default: "nextval(artists_artistid_seq::regclass)",
            primary_key: true,
            is_unique: false,
          },
          {
            name: "name",
            type: "character",
            is_nullable: "YES",
            column_default: null,
            primary_key: false,
            is_unique: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    const columns = await adapter.getColumns("artists", "postgres");
    expect(columns.length).toBe(2);
    expect(columns[0].name).toBe("artistid");
    expect(columns[0].type).toBe("BIGINT");
    expect(columns[1].name).toBe("name");
    expect(columns[1].type).toBe("CHARACTER");
  });

  test("execute select", async () => {
    mockPgQuery.mockResolvedValue({ rows: [{ artistid: 1, name: "Test" }], rowCount: 1 });
    const resp = await adapter.execute("SELECT * FROM artists LIMIT 10", "postgres");
    expect(resp.ok).toBe(true);
    expect(resp.raw).toEqual([{ artistid: 1, name: "Test" }]);
  });

  test("execute error", async () => {
    mockPgQuery.mockRejectedValue(new Error("relation does not exist"));
    const resp = await adapter.execute("SELECT * FROM nonexistent", "postgres");
    expect(resp.ok).toBe(false);
    expect(resp.error).toBeDefined();
  });
});
