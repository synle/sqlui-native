import AzureTableStorageAdapter from 'src/common/adapters/AzureTableStorageAdapter/index';

const azTableConnectionString = process.env.AZTABLE_CONNECTION_STRING;
const adapter = new AzureTableStorageAdapter(`aztable://${azTableConnectionString}`);

describe('AzureTableStorageAdapter', () => {
  test('Authenticate', async () => {
    await adapter.authenticate();
  });

  test('getDatabases', async () => {
    const actual = await adapter.getDatabases();
    expect(actual).toMatchInlineSnapshot(`
Array [
  Object {
    "name": "Azure Table Storage",
    "tables": Array [],
  },
]
`);
  });

  test('getTables', async () => {
    const actual = await adapter.getTables();
    expect(actual.length).toBeGreaterThan(0);
    expect(actual[0].name).toBeDefined();
  });

  test('execute list data', async () => {
    const actual = await adapter.execute('client.listEntities()', 'Azure Table Storage', 'syaztabl1');
    expect(actual?.raw?.length).toBeGreaterThan(0);
    expect(actual?.raw[0]?.etag).toBeDefined();
    expect(actual?.raw[0]?.partitionKey).toBeDefined();
    expect(actual?.raw[0]?.id).toBeDefined();
  });
});
