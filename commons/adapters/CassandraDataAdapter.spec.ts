import CassandraDataAdapter from './CassandraDataAdapter';

const adapter = new CassandraDataAdapter('cassandra://test.db');

describe('cassandra', () => {
  test('cassandra - Get database', async () => {
    const databases = await adapter.getDatabases();
    expect(databases).toMatchSnapshot();
  });

  test('cassandra - Get tables', async () => {
    const tables = await adapter.getTables('system');
    expect(tables).toMatchSnapshot();
  });

  test('cassandra - Get columns', async () => {
    const columns = await adapter.getColumns('columns', 'system_schema');
    expect(columns).toMatchSnapshot();
  });

  test('Execute Select', async () => {
    const resp = await adapter.execute(`SELECT * FROM tables LIMIT 10`, 'system_schema');
    expect(resp).toMatchSnapshot();
  });
});
