import RelationalDataAdapter from "src/common/adapters/RelationalDataAdapter/index";

const CONNECTION = "postgres://postgres:password123!@127.0.0.1:5432";

describe("postgres integration", () => {
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
    expect(names).toContain("postgres");
  });

  test("create test table", async () => {
    await adapter.execute(
      `CREATE TABLE IF NOT EXISTS artists (
        ArtistId SERIAL PRIMARY KEY,
        Name VARCHAR(120)
      )`,
      "postgres",
    );
    await adapter.execute(`INSERT INTO artists (Name) VALUES ('Test Artist 1')`, "postgres");
    await adapter.execute(`INSERT INTO artists (Name) VALUES ('Test Artist 2')`, "postgres");
    await adapter.execute(`INSERT INTO artists (Name) VALUES ('Test Artist 3')`, "postgres");
  });

  test("getTables", async () => {
    const tables = await adapter.getTables("postgres");
    const names = tables.map((t) => t.name);
    expect(names).toContain("artists");
  });

  test("getColumns", async () => {
    const columns = await adapter.getColumns("artists", "postgres");
    expect(columns.length).toBe(2);
    const names = columns.map((c) => c.name);
    expect(names).toContain("artistid");
    expect(names).toContain("name");
  });

  test("execute select", async () => {
    const resp = await adapter.execute(`SELECT * FROM artists ORDER BY Name ASC LIMIT 10`, "postgres");
    expect(resp.ok).toBe(true);
    expect(resp.raw?.length).toBe(3);
  });

  test("execute update", async () => {
    const resp = await adapter.execute(`UPDATE artists SET Name = 'Updated Artist' WHERE ArtistId = 1`, "postgres");
    expect(resp.ok).toBe(true);
  });

  test("execute delete", async () => {
    const resp = await adapter.execute(`DELETE FROM artists WHERE ArtistId = 1`, "postgres");
    expect(resp.ok).toBe(true);
  });

  test("cleanup", async () => {
    await adapter.execute(`DROP TABLE IF EXISTS artists`, "postgres");
  });
});

describe.skip("postgres legacy", () => {
  let adapter;

  beforeAll(() => {
    adapter = new RelationalDataAdapter("postgres://postgres:password123!@127.0.0.1:5432");
  });

  test("Get tables", async () => {
    const tables = await adapter.getTables("music_store");
    expect(tables.length).toBeGreaterThan(0);
  });

  test("Get columns", async () => {
    const columns = await adapter.getColumns("artists", "music_store");
    expect(columns.length).toBe(2);
  });

  test("Execute Select", async () => {
    const resp = await adapter.execute(`SELECT * FROM artists ORDER BY Name ASC LIMIT 10`, "music_store");
    //@ts-ignore
    expect(resp && resp.raw && resp.raw.length > 0 && resp.raw.length <= 10).toBe(true);
  });

  test("Execute Update", async () => {
    try {
      await adapter.execute(`UPDATE artists SET name = 'AC/DC' WHERE ArtistId = '1'`, "music_store");
      expect(1).toBe(1);
    } catch (err) {
      expect(err).toBeUndefined();
    }
  });
});
