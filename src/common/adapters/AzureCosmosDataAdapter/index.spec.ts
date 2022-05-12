import AzureCosmosDataAdapter from 'src/common/adapters/AzureCosmosDataAdapter/index';

const cosmosDBConnectionString = process.env.COSMOS_CONNECTION_STRING;
const adapter = new AzureCosmosDataAdapter(`cosmosdb://${cosmosDBConnectionString}`);

describe.skip('cosmosdb', () => {
  test('getDatabases', async () => {
    const actual = await adapter.getDatabases();
    expect(actual.length).toBeGreaterThan(0);
    expect(actual[0].name).toBeDefined();
  });

  test('getTables', async () => {
    const actual = await adapter.getTables('sy-test-database1');
    expect(actual.length).toBeGreaterThan(0);
    expect(actual[0].name).toBeDefined();
  });

  test('getColumns', async () => {
    const actual = await adapter.getColumns('sy-test-container1', 'sy-test-database1');
    expect(actual.length).toBeGreaterThan(0);
    expect(actual[0].name).toBeDefined();
    expect(actual[0].type).toBeDefined();
  });

  test('execute', async () => {
    const actual = await adapter.execute('SELECT * FROM C OFFSET 1 LIMIT 2', 'sy-test-database1', 'sy-test-container1');
    expect(actual?.raw?.length).toBeGreaterThan(0);
  });
});