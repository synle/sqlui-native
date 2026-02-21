import MongoDBDataAdapter from "src/common/adapters/MongoDBDataAdapter/index";

const CONNECTION = "mongodb://127.0.0.1:27017";

describe("mongodb integration", () => {
  let adapter: MongoDBDataAdapter;

  beforeAll(() => {
    adapter = new MongoDBDataAdapter(CONNECTION);
  });

  test("authenticate", async () => {
    await adapter.authenticate();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBeGreaterThan(0);
  });

  test("create test data", async () => {
    const resp = await adapter.execute(
      `db.collection('artists').insertMany([
        { name: 'Test Artist 1', genre: 'Rock' },
        { name: 'Test Artist 2', genre: 'Jazz' },
        { name: 'Test Artist 3', genre: 'Pop' }
      ])`,
      "sqlui_test",
    );
    expect(resp.ok).toBe(true);
  });

  test("getTables", async () => {
    const tables = await adapter.getTables("sqlui_test");
    const names = tables.map((t) => t.name);
    expect(names).toContain("artists");
  });

  test("getColumns", async () => {
    const columns = await adapter.getColumns("artists", "sqlui_test");
    expect(columns.length).toBeGreaterThan(0);
    const names = columns.map((c) => c.name);
    expect(names).toContain("name");
    expect(names).toContain("genre");
  });

  test("execute find", async () => {
    const resp = await adapter.execute(`db.collection('artists').find({}).toArray()`, "sqlui_test");
    expect(resp.ok).toBe(true);
    expect(resp.raw?.length).toBe(3);
  });

  test("execute findOne", async () => {
    const resp = await adapter.execute(
      `db.collection('artists').findOne({ name: 'Test Artist 1' })`,
      "sqlui_test",
    );
    expect(resp.ok).toBe(true);
    expect(resp.raw).toBeDefined();
  });

  test("execute updateOne", async () => {
    const resp = await adapter.execute(
      `db.collection('artists').updateOne({ name: 'Test Artist 1' }, { $set: { name: 'Updated Artist' } })`,
      "sqlui_test",
    );
    expect(resp.ok).toBe(true);
  });

  test("execute deleteOne", async () => {
    const resp = await adapter.execute(
      `db.collection('artists').deleteOne({ name: 'Updated Artist' })`,
      "sqlui_test",
    );
    expect(resp.ok).toBe(true);
  });

  test("cleanup", async () => {
    await adapter.execute(`db.collection('artists').drop()`, "sqlui_test");
  });
});
