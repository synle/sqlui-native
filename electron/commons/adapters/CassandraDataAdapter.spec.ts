import CassandraDataAdapter from 'electron/commons/adapters/CassandraDataAdapter';

const adapter = new CassandraDataAdapter('cassandra://localhost:9042');

describe('cassandra v4', () => {
  test('Get database', async () => {
    const databases = await adapter.getDatabases();
    expect(databases).toMatchSnapshot();
  });

  test('Get tables', async () => {
    const tables = await adapter.getTables('system');
    expect(tables).toMatchSnapshot();
  });

  test('Get columns', async () => {
    const columns = await adapter.getColumns('columns', 'system_schema');
    expect(columns).toMatchSnapshot();
  });

  test('Execute Select', async () => {
    const resp = await adapter.execute(`SELECT * FROM tables LIMIT 10`, 'system_schema');
    //@ts-ignore
    expect(resp.raw.length > 0).toBeTruthy();
  });
});
