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


  test('getTables', async () => {
    const actual = await adapter.execute('aaa', 'Azure Table Storage', 'syaztabl1');
  });
});
