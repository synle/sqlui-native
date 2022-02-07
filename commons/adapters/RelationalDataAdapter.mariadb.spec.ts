import RelationalDataAdapter from 'commons/adapters/RelationalDataAdapter';

// this is a big integration, won't be run on smoke test
describe('mariadb', () => {
  const adapter = new RelationalDataAdapter('mariadb://root:password@localhost:33061');

  test('Get tables', async () => {
    const tables = await adapter.getTables('music_store');
    expect(tables).toMatchSnapshot();
  });

  test('Get columns', async () => {
    const columns = await adapter.getColumns('artists', 'music_store');
    expect(columns).toMatchSnapshot();
  });

  test('Execute Select', async () => {
    const resp = await adapter.execute(
      `SELECT * FROM artists ORDER BY Name ASC LIMIT 10`,
      'music_store',
    );
    //@ts-ignore
    expect(resp && resp.raw && resp.raw.length > 0 && resp.raw.length <= 10).toBe(true);
  });

  test('Execute Update', async () => {
    try {
      const resp = await adapter.execute(
        `UPDATE artists SET name = 'AC/DC' WHERE ArtistId = '1'`,
        'music_store',
      );
      expect(1).toBe(1);
    } catch (err) {
      expect(err).toBeUndefined();
    }
  });
});
