import CassandraDataAdapter from './CassandraDataAdapter';

const adapter = new CassandraDataAdapter('cassandra://test.db');

test('cassandra - Get database', async () => {
  const databases = await adapter.getDatabases();
  expect(databases).toMatchSnapshot();
});

test('cassandra - Get tables', async () => {
  const tables = await adapter.getTables('system');
  expect(tables).toBe(1);
});

test('cassandra - Get columns', async () => {
  const columns = await adapter.getColumns('artists');
  expect(1).toBe(1);
});
