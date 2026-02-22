import AzureCosmosDataAdapter from "src/common/adapters/AzureCosmosDataAdapter/index";

const connectionString = process.env.TEST_AZ_COSMOSDB_CONNECTION;

const shouldRun = !!connectionString;

const describeIfEnv = shouldRun ? describe : describe.skip;

describeIfEnv("AzureCosmosDataAdapter integration", () => {
  let adapter: AzureCosmosDataAdapter;
  const testDbName = `testintegration${Date.now()}`;
  const testContainerName = `testcontainer${Date.now()}`;
  const testItemId = `testitem${Date.now()}`;

  beforeAll(async () => {
    adapter = new AzureCosmosDataAdapter(connectionString!);
    await adapter.authenticate();
  });

  test("authenticate", async () => {
    await expect(adapter.authenticate()).resolves.toBeUndefined();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBeGreaterThan(0);
    expect(databases[0].name).toBeDefined();
  });

  test("execute - create database", async () => {
    const result = await adapter.execute(`client.databases.create({ id: '${testDbName}' })`, testDbName);
    expect(result.ok).toBe(true);
  });

  test("getDatabases - should include created database", async () => {
    const databases = await adapter.getDatabases();
    const found = databases.some((db) => db.name === testDbName);
    expect(found).toBe(true);
  });

  test("execute - create container", async () => {
    const result = await adapter.execute(
      `client.database('${testDbName}').containers.create({ id: '${testContainerName}', partitionKey: { paths: ['/id'] } })`,
      testDbName,
      testContainerName,
    );
    expect(result.ok).toBe(true);
  });

  test("getTables - should include created container", async () => {
    const tables = await adapter.getTables(testDbName);
    expect(tables.length).toBeGreaterThan(0);
    const found = tables.some((t) => t.name === testContainerName);
    expect(found).toBe(true);
  });

  test("execute - insert item", async () => {
    const result = await adapter.execute(
      `client.database('${testDbName}').container('${testContainerName}').items.create({ "id": "${testItemId}" })`,
      testDbName,
      testContainerName,
    );
    expect(result.ok).toBe(true);
  });

  test("execute - select all with raw SQL", async () => {
    const result = await adapter.execute(`SELECT * FROM c`, testDbName, testContainerName);
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
    expect(Array.isArray(result.raw)).toBe(true);
    expect(result.raw!.length).toBeGreaterThan(0);
  });

  test("execute - select by id with client query", async () => {
    const result = await adapter.execute(
      `client.database('${testDbName}').container('${testContainerName}').items.query({ query: \`SELECT * FROM c WHERE c.id = '${testItemId}'\` }).fetchAll()`,
      testDbName,
      testContainerName,
    );
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
    expect(Array.isArray(result.raw)).toBe(true);
    expect(result.raw!.length).toBe(1);
  });

  test("execute - select specific columns with client query", async () => {
    const result = await adapter.execute(
      `client.database('${testDbName}').container('${testContainerName}').items.query({ query: \`SELECT c.id, c._etag, c._rid, c._self, c._ts FROM c WHERE c.id = '${testItemId}' OFFSET 0 LIMIT 1000\` }).fetchAll()`,
      testDbName,
      testContainerName,
    );
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
    expect(Array.isArray(result.raw)).toBe(true);
    expect(result.raw!.length).toBeGreaterThan(0);
  });

  test("execute - read item", async () => {
    const result = await adapter.execute(
      `client.database('${testDbName}').container('${testContainerName}').item('${testItemId}', '${testItemId}').read()`,
      testDbName,
      testContainerName,
    );
    expect(result.ok).toBe(true);
  });

  test("execute - update item", async () => {
    const result = await adapter.execute(
      `client.database('${testDbName}').container('${testContainerName}').item('${testItemId}', '${testItemId}').replace({ "id": "${testItemId}" })`,
      testDbName,
      testContainerName,
    );
    expect(result.ok).toBe(true);
  });

  test("getColumns - should return columns from test container", async () => {
    const columns = await adapter.getColumns(testContainerName, testDbName);
    expect(columns.length).toBeGreaterThan(0);
    expect(columns[0].name).toBeDefined();
    expect(columns[0].type).toBeDefined();
  });

  test("execute - delete item", async () => {
    const result = await adapter.execute(
      `client.database('${testDbName}').container('${testContainerName}').item('${testItemId}', '${testItemId}').delete()`,
      testDbName,
      testContainerName,
    );
    expect(result.ok).toBe(true);
  });

  test("execute - drop database", async () => {
    const result = await adapter.execute(`client.database('${testDbName}').delete()`, testDbName);
    expect(result.ok).toBe(true);
  });

  test("execute - error does not throw", async () => {
    const result = await adapter.execute("invalid query that should fail");
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe.skip("cosmosdb legacy", () => {
  const cosmosDBConnectionString = process.env.COSMOS_CONNECTION_STRING;
  const adapter = new AzureCosmosDataAdapter(`cosmosdb://${cosmosDBConnectionString}`);

  test("getDatabases", async () => {
    const actual = await adapter.getDatabases();
    expect(actual.length).toBeGreaterThan(0);
    expect(actual[0].name).toBeDefined();
  });

  test("getTables", async () => {
    const actual = await adapter.getTables("sy-test-database1");
    expect(actual.length).toBeGreaterThan(0);
    expect(actual[0].name).toBeDefined();
  });

  test("getColumns", async () => {
    const actual = await adapter.getColumns("sy-test-container1", "sy-test-database1");
    expect(actual.length).toBeGreaterThan(0);
    expect(actual[0].name).toBeDefined();
    expect(actual[0].type).toBeDefined();
  });

  test("execute", async () => {
    const actual = await adapter.execute("SELECT * FROM C OFFSET 1 LIMIT 2", "sy-test-database1", "sy-test-container1");
    expect(actual?.raw?.length).toBeGreaterThan(0);
  });
});
