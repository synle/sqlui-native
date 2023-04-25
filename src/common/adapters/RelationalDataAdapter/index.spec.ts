import fs from 'fs';
import RelationalDataAdapter from 'src/common/adapters/RelationalDataAdapter/index';

describe('sqlite', () => {
  let adapter;
  if (process.platform === 'win32') {
    test('Skipped for win32', async () => {});
    return;
  }

  beforeAll(() => {
    const mockedDbFilePath = `mocked-db.sqlite`;

    // try remove the mocked db before starting this test
    try {
      fs.unlinkSync(mockedDbFilePath);
    } catch (err) {}

    adapter = new RelationalDataAdapter(`sqlite://${mockedDbFilePath}`);
  });

  test('Create and insert table', async () => {
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

  test('Get tables', async () => {
    const tables = await adapter.getTables();
    expect(tables).toMatchInlineSnapshot(`
Array [
  Object {
    "columns": Array [],
    "name": "artists",
  },
]
`);
  });

  test('Get columns', async () => {
    const columns = await adapter.getColumns('artists');
    expect(columns).toMatchInlineSnapshot(`
Array [
  Object {
    "allowNull": false,
    "defaultValue": undefined,
    "name": "ArtistId",
    "primaryKey": true,
    "type": "INTEGER",
    "unique": false,
  },
  Object {
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

  test('Execute Select', async () => {
    const resp = await adapter.execute(`SELECT * FROM artists ORDER BY Name ASC LIMIT 10`);
    expect(resp?.raw?.length).toBe(3);
    expect(resp?.ok).toBe(true);
    expect(resp.raw).toMatchInlineSnapshot(`
Array [
  Object {
    "ArtistId": 1,
    "Name": "Test Artist 1",
  },
  Object {
    "ArtistId": 2,
    "Name": "Test Artist 2",
  },
  Object {
    "ArtistId": 3,
    "Name": "Test Artist 3",
  },
]
`);
  });

  test('Execute Update', async () => {
    try {
      const resp = await adapter.execute(`UPDATE artists SET name = 'AC/DC' WHERE ArtistId = '1'`);
      expect(1).toBe(1);
    } catch (err) {
      expect(err).toBeUndefined();
    }
  });
});