import RedisDataAdapter from 'src/common/adapters/RedisDataAdapter';

const adapter = new RedisDataAdapter('redis://localhost:6379');

describe.skip('redis', () => {
  test('Set', async () => {
    await adapter.execute(`db.set('key', 'value123');`);
  });

  test('Get', async () => {
    await adapter.execute(`db.get('key');`);
  });

  test('Scan', async () => {
    await adapter.execute(`db.keys("*")`);
  });
});