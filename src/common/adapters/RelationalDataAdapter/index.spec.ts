import createRelationalDataAdapter from "src/common/adapters/RelationalDataAdapter/index";

describe("sqlite", () => {
  let adapter;
  if (process.platform === "win32") {
    test("Skipped for win32", async () => {});
    return;
  }

  beforeAll(() => {
    // Use an in-memory SQLite DB so the test is self-contained and bypasses the
    // file-state classifier (added in 77da1cad), which now throws "SQLite file
    // not found" for paths that don't yet exist. The same adapter instance is
    // reused across the tests below, so the in-memory data persists between
    // them on a single shared connection. File-based behavior is covered
    // separately by sqlite/index.spec.ts.
    adapter = createRelationalDataAdapter(`sqlite://:memory:`);
  });

  test("Create and insert table", async () => {
    try {
      // create the table
      await adapter.execute(`
      CREATE TABLE artists (
        ArtistId INTEGER PRIMARY KEY NOT NULL,
        Name NVARCHAR(120)
      )
    `);

      // insert some record
      await adapter.execute(`
      INSERT INTO artists (Name) VALUES ('Test Artist 1');
    `);
      await adapter.execute(`
      INSERT INTO artists (Name) VALUES ('Test Artist 2');
    `);
      await adapter.execute(`
      INSERT INTO artists (Name) VALUES ('Test Artist 3');
    `);

      expect(1).toBe(1);
    } catch (err) {
      expect(err).toBeUndefined();
    }
  });

  test("Get tables", async () => {
    const tables = await adapter.getTables();
    expect(tables).toMatchInlineSnapshot(`
      [
        {
          "columns": [],
          "name": "artists",
        },
      ]
    `);
  });

  test("Get columns", async () => {
    const columns = await adapter.getColumns("artists");
    expect(columns).toMatchInlineSnapshot(`
      [
        {
          "allowNull": false,
          "defaultValue": undefined,
          "name": "ArtistId",
          "primaryKey": true,
          "type": "INTEGER",
          "unique": false,
        },
        {
          "allowNull": true,
          "defaultValue": undefined,
          "name": "Name",
          "primaryKey": false,
          "type": "NVARCHAR(120)",
          "unique": false,
        },
      ]
    `);
  });

  test("Execute Select", async () => {
    const resp = await adapter.execute(`SELECT * FROM artists ORDER BY Name ASC LIMIT 10`);
    expect(resp?.raw?.length).toBe(3);
    expect(resp?.ok).toBe(true);
    expect(resp.raw).toMatchInlineSnapshot(`
      [
        {
          "ArtistId": 1,
          "Name": "Test Artist 1",
        },
        {
          "ArtistId": 2,
          "Name": "Test Artist 2",
        },
        {
          "ArtistId": 3,
          "Name": "Test Artist 3",
        },
      ]
    `);
  });

  test("Execute Update", async () => {
    try {
      await adapter.execute(`UPDATE artists SET name = 'AC/DC' WHERE ArtistId = '1'`);
      expect(1).toBe(1);
    } catch (err) {
      expect(err).toBeUndefined();
    }
  });
});
