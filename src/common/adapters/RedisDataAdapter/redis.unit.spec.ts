import { vi } from "vitest";

const mockConnect = vi.fn().mockResolvedValue(undefined);
const mockDisconnect = vi.fn().mockResolvedValue(undefined);
const mockSet = vi.fn().mockResolvedValue("OK");
const mockGet = vi.fn().mockResolvedValue("test_value");
const mockDel = vi.fn().mockResolvedValue(1);
const mockOn = vi.fn().mockImplementation((event, cb) => {
  if (event === "ready") {
    setTimeout(() => cb(), 0);
  }
});

vi.mock("redis", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    set: mockSet,
    get: mockGet,
    del: mockDel,
    on: mockOn,
  })),
}));

import RedisDataAdapter from "src/common/adapters/RedisDataAdapter/index";

describe("RedisDataAdapter unit", () => {
  let adapter: RedisDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockImplementation((event, cb) => {
      if (event === "ready") {
        setTimeout(() => cb(), 0);
      }
    });
    adapter = new RedisDataAdapter("redis://127.0.0.1:6379");
  });

  test("authenticate", async () => {
    await adapter.authenticate();
    expect(mockConnect).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBe(1);
    expect(databases[0].name).toBe("Redis Database");
  });

  test("getTables", async () => {
    const tables = await adapter.getTables();
    expect(tables.length).toBe(1);
    expect(tables[0].name).toBe("Redis Table");
  });

  test("getColumns", async () => {
    const columns = await adapter.getColumns();
    expect(columns).toEqual([]);
  });

  test("execute error - invalid syntax", async () => {
    const resp = await adapter.execute("invalid query without db prefix");
    expect(resp.ok).toBe(false);
    expect(resp.error).toBeDefined();
  });

  test("execute set", async () => {
    const resp = await adapter.execute("db.set('key', 'value')");
    expect(resp.ok).toBe(true);
  });

  test("execute get", async () => {
    const resp = await adapter.execute("db.get('key')");
    expect(resp.ok).toBe(true);
    expect(resp.raw).toEqual([{ value: "test_value" }]);
  });
});
