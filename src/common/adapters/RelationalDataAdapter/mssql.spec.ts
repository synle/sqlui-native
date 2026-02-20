import RelationalDataAdapter from "src/common/adapters/RelationalDataAdapter/index";
// this is a big integration, won't be run on smoke test
describe.skip("mssql", () => {
  let adapter;

  beforeAll(() => {
    adapter = new RelationalDataAdapter("mssql://sa:password123!@localhost:1433");
  });

  test("Get tables", async () => {
    const tables = await adapter.getTables("music_store");
    expect(tables).toMatchInlineSnapshot(`
Array [
  Object {
    "columns": Array [],
    "name": "albums",
  },
  Object {
    "columns": Array [],
    "name": "artists",
  },
  Object {
    "columns": Array [],
    "name": "customers",
  },
  Object {
    "columns": Array [],
    "name": "employees",
  },
  Object {
    "columns": Array [],
    "name": "genres",
  },
  Object {
    "columns": Array [],
    "name": "invoice_items",
  },
  Object {
    "columns": Array [],
    "name": "invoices",
  },
  Object {
    "columns": Array [],
    "name": "media_types",
  },
  Object {
    "columns": Array [],
    "name": "playlist_track",
  },
  Object {
    "columns": Array [],
    "name": "playlists",
  },
  Object {
    "columns": Array [],
    "name": "tracks",
  },
]
`);
  });

  test("Get columns", async () => {
    const columns = await adapter.getColumns("artists", "music_store");
    expect(columns).toMatchInlineSnapshot(`
Array [
  Object {
    "allowNull": false,
    "autoIncrement": true,
    "comment": null,
    "defaultValue": null,
    "name": "ArtistId",
    "primaryKey": true,
    "type": "INT",
  },
  Object {
    "allowNull": true,
    "autoIncrement": false,
    "comment": null,
    "defaultValue": null,
    "name": "Name",
    "primaryKey": false,
    "type": "NVARCHAR(120)",
  },
]
`);
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
