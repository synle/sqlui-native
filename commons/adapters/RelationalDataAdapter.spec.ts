import RelationalDataAdapter from './RelationalDataAdapter';

const adapter = new RelationalDataAdapter('sqlite://mocked-db.sqlite');

describe('sqlite', () => {
  test('sqlite - Create and insert table', async () => {
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

  test('sqlite - Get tables', async () => {
    const tables = await adapter.getTables();
    expect(tables).toMatchSnapshot();
  });

  test('sqlite - Get columns', async () => {
    const columns = await adapter.getColumns('artists');
    expect(columns).toMatchSnapshot();
  });

  test('sqlite - Execute Select', async () => {
    const resp = await adapter.execute(`SELECT * FROM artists ORDER BY Name ASC LIMIT 10`);
    expect(resp?.raw?.length).toBe(3);
    expect(resp).toMatchSnapshot();
  });

  test('sqlite - Execute Update', async () => {
    try{
    const resp = await adapter.execute(`UPDATE artists SET name = 'AC/DC' WHERE ArtistId = '1'`);
    expect(1).toBe(1);
    } catch (err) {
      expect(err).toBeUndefined();
    }
  });
});
