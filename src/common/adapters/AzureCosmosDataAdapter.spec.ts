import AzureCosmosDataAdapter from 'src/common/adapters/AzureCosmosDataAdapter';

const cosmosDBConnectionString = process.env.COSMOS_CONNECTION_STRING;
const adapter = new AzureCosmosDataAdapter(`cosmosdb://${cosmosDBConnectionString}`);

describe('cosmosdb', () => {
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

  test.only('getColumns', async () => {
    const actual = await adapter.getColumns('sy-test-container1', 'sy-test-database1');
    expect(actual).toBe('');
  });
});
