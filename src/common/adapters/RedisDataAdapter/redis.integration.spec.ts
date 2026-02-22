import RedisDataAdapter from "src/common/adapters/RedisDataAdapter/index";

const CONNECTION = "redis://127.0.0.1:6379";

describe("redis integration", () => {
  let adapter: RedisDataAdapter;

  beforeAll(() => {
    adapter = new RedisDataAdapter(CONNECTION);
  });

  test("authenticate", async () => {
    await adapter.authenticate();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBeGreaterThan(0);
  });

  test("execute set", async () => {
    const resp = await adapter.execute(`db.set('sqlui_test_key', 'test_value')`);
    expect(resp.ok).toBe(true);
  });

  test("execute get", async () => {
    const resp = await adapter.execute(`db.get('sqlui_test_key')`);
    expect(resp.ok).toBe(true);
    expect(resp.raw).toMatchInlineSnapshot(`
      [
        {
          "value": "test_value",
        },
      ]
    `);
  });

  test("execute hSet and hGetAll", async () => {
    await adapter.execute(`db.hSet('sqlui_test_hash', 'field1', 'value1')`);
    await adapter.execute(`db.hSet('sqlui_test_hash', 'field2', 'value2')`);
    const resp = await adapter.execute(`db.hGetAll('sqlui_test_hash')`);
    expect(resp.ok).toBe(true);
    expect(resp.raw).toMatchInlineSnapshot(`
      [
        {
          "field1": "value1",
          "field2": "value2",
        },
      ]
    `);
  });

  test("getTables (scan keys)", async () => {
    const tables = await adapter.getTables();
    expect(tables.length).toBeGreaterThan(0);
  });

  test("cleanup", async () => {
    await adapter.execute(`db.del('sqlui_test_key')`);
    await adapter.execute(`db.del('sqlui_test_hash')`);
  });
});

describe.skip("redis legacy", () => {
  const adapter = new RedisDataAdapter("redis://127.0.0.1:6379");

  test("Set", async () => {
    await adapter.execute(`db.set('key', 'value123');`);
  });

  test("Get", async () => {
    await adapter.execute(`db.get('key');`);
  });

  test("Scan", async () => {
    const actual = await adapter.getTables();
    expect(actual.length).toBeGreaterThan(0);
    expect(actual[0].name).toBeDefined();
  });
});
