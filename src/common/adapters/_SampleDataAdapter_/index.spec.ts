import YOUR_ADAPTER_NAME from 'src/common/adapters/YOUR_ADAPTER_NAME/index';

const adapter = new YOUR_ADAPTER_NAME('some_connection');

describe.skip('redis', () => {
  test('Set', async () => {
    await adapter.execute(`db.set('key', 'value123');`);
  });
});