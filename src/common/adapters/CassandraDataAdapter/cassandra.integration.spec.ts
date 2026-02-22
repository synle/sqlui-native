import CassandraDataAdapter from "src/common/adapters/CassandraDataAdapter/index";

describe("cassandra v4 integration", () => {
  const CONNECTION = "cassandra://127.0.0.1:9042";
  let adapter: CassandraDataAdapter;

  beforeAll(() => {
    adapter = new CassandraDataAdapter(CONNECTION);
  });

  test("authenticate", async () => {
    await adapter.authenticate();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBeGreaterThan(0);
    const names = databases.map((d) => d.name);
    expect(names).toContain("system");
  });

  test("create test keyspace and table", async () => {
    await adapter.execute(
      `CREATE KEYSPACE IF NOT EXISTS sqlui_test WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`,
    );
    await adapter.execute(`CREATE TABLE IF NOT EXISTS artists (artist_id int PRIMARY KEY, name text)`, "sqlui_test");
    await adapter.execute(`INSERT INTO artists (artist_id, name) VALUES (1, 'Test Artist 1')`, "sqlui_test");
    await adapter.execute(`INSERT INTO artists (artist_id, name) VALUES (2, 'Test Artist 2')`, "sqlui_test");
    await adapter.execute(`INSERT INTO artists (artist_id, name) VALUES (3, 'Test Artist 3')`, "sqlui_test");
  });

  test("getTables", async () => {
    const tables = await adapter.getTables("sqlui_test");
    const names = tables.map((t) => t.name);
    expect(names).toContain("artists");
  });

  test("getColumns", async () => {
    const columns = await adapter.getColumns("artists", "sqlui_test");
    expect(columns.length).toBe(2);
    const names = columns.map((c) => c.name);
    expect(names).toContain("artist_id");
    expect(names).toContain("name");
  });

  test("execute select", async () => {
    const resp = await adapter.execute(`SELECT * FROM artists LIMIT 10`, "sqlui_test");
    expect(resp.ok).toBe(true);
    expect(resp.raw?.length).toBe(3);
  });

  test("cleanup", async () => {
    await adapter.execute(`DROP KEYSPACE IF EXISTS sqlui_test`);
  });
});

describe.skip("cassandra v4 legacy", () => {
  let adapter;

  beforeAll(() => {
    adapter = new CassandraDataAdapter("cassandra://127.0.0.1:9042");
  });

  test("Get database", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBeGreaterThan(0);
    const names = databases.map((d) => d.name);
    expect(names).toContain("system");
  });

  test("Get tables", async () => {
    const tables = await adapter.getTables("system");
    expect(tables.length).toBeGreaterThan(0);
  });

  test("Get columns", async () => {
    const columns = await adapter.getColumns("columns", "system_schema");
    expect(columns.length).toBeGreaterThan(0);
  });

  test("Execute Select", async () => {
    const resp = await adapter.execute(`SELECT * FROM tables LIMIT 10`, "system_schema");
    //@ts-ignore
    expect(resp.raw.length > 0).toBeTruthy();
  });
});

describe("cassandra v2 integration", () => {
  const CONNECTION = "cassandra://127.0.0.1:9043";
  let adapter: CassandraDataAdapter;

  beforeAll(() => {
    adapter = new CassandraDataAdapter(CONNECTION);
  });

  test("authenticate", async () => {
    await adapter.authenticate();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBeGreaterThan(0);
    const names = databases.map((d) => d.name);
    expect(names).toContain("system");
  });

  test("create test keyspace and table", async () => {
    await adapter.execute(
      `CREATE KEYSPACE IF NOT EXISTS sqlui_test WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}`,
    );
    await adapter.execute(`CREATE TABLE IF NOT EXISTS artists (artist_id int PRIMARY KEY, name text)`, "sqlui_test");
    await adapter.execute(`INSERT INTO artists (artist_id, name) VALUES (1, 'Test Artist 1')`, "sqlui_test");
    await adapter.execute(`INSERT INTO artists (artist_id, name) VALUES (2, 'Test Artist 2')`, "sqlui_test");
    await adapter.execute(`INSERT INTO artists (artist_id, name) VALUES (3, 'Test Artist 3')`, "sqlui_test");
  });

  test("getTables", async () => {
    const tables = await adapter.getTables("sqlui_test");
    const names = tables.map((t) => t.name);
    expect(names).toContain("artists");
  });

  test("getColumns", async () => {
    const columns = await adapter.getColumns("artists", "sqlui_test");
    expect(columns.length).toBe(2);
    const names = columns.map((c) => c.name);
    expect(names).toContain("artist_id");
    expect(names).toContain("name");
  });

  test("execute select", async () => {
    const resp = await adapter.execute(`SELECT * FROM artists LIMIT 10`, "sqlui_test");
    expect(resp.ok).toBe(true);
    expect(resp.raw?.length).toBe(3);
  });

  test("cleanup", async () => {
    await adapter.execute(`DROP KEYSPACE IF EXISTS sqlui_test`);
  });
});
