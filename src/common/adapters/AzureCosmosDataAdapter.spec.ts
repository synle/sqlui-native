import AzureCosmosDataAdapter from 'src/common/adapters/AzureCosmosDataAdapter';

const cosmosDBConnectionString = process.env.COSMOS_CONNECTION_STRING;
const adapter = new AzureCosmosDataAdapter(`cosmosdb://${cosmosDBConnectionString}`);

describe.skip('cosmosdb', () => {
  test('getParsedConnectionOptions', async () => {
    const actual = AzureCosmosDataAdapter.getParsedConnectionOptions(`cosmosdb://AccountEndpoint=some_cosmos_endpoint;AccountKey=some_cosmos_account_key`);
    expect(actual).toMatchInlineSnapshot(`
Object {
  "AccountEndpoint": "some_cosmos_endpoint",
  "AccountKey": "some_cosmos_account_key",
}
`);
  });

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
