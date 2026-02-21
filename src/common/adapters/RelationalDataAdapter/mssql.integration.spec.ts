import RelationalDataAdapter from "src/common/adapters/RelationalDataAdapter/index";

const CONNECTION = "mssql://sa:password123!@127.0.0.1:1433";

describe("mssql integration", () => {
  let adapter: RelationalDataAdapter;

  beforeAll(() => {
    adapter = new RelationalDataAdapter(CONNECTION);
  });

  test("authenticate", async () => {
    await adapter.authenticate();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBeGreaterThan(0);
    const names = databases.map((d) => d.name);
    expect(names).toContain("master");
  });

  test("create test database and table", async () => {
    await adapter.execute(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'sqlui_test')
      CREATE DATABASE sqlui_test
    `);
    await adapter.execute(
      `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='artists' AND xtype='U')
      CREATE TABLE artists (
        ArtistId INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(120)
      )`,
      "sqlui_test",
    );
    await adapter.execute(`INSERT INTO artists (Name) VALUES ('Test Artist 1')`, "sqlui_test");
    await adapter.execute(`INSERT INTO artists (Name) VALUES ('Test Artist 2')`, "sqlui_test");
    await adapter.execute(`INSERT INTO artists (Name) VALUES ('Test Artist 3')`, "sqlui_test");
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
    expect(names).toContain("ArtistId");
    expect(names).toContain("Name");
  });

  test("execute select", async () => {
    const resp = await adapter.execute(`SELECT TOP 10 * FROM artists ORDER BY Name ASC`, "sqlui_test");
    expect(resp.ok).toBe(true);
    expect(resp.raw?.length).toBe(3);
  });

  test("execute update", async () => {
    const resp = await adapter.execute(`UPDATE artists SET Name = 'Updated Artist' WHERE ArtistId = 1`, "sqlui_test");
    expect(resp.ok).toBe(true);
  });

  test("execute delete", async () => {
    const resp = await adapter.execute(`DELETE FROM artists WHERE ArtistId = 1`, "sqlui_test");
    expect(resp.ok).toBe(true);
  });

  test("cleanup", async () => {
    await adapter.execute(`DROP DATABASE IF EXISTS sqlui_test`);
  });
});
