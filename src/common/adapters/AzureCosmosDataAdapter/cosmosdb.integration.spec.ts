import AzureCosmosDataAdapter from "src/common/adapters/AzureCosmosDataAdapter/index";

const connectionString = process.env.TEST_AZ_COSMOSDB_CONNECTION;

const shouldRun = !!connectionString;

const describeIfEnv = shouldRun ? describe : describe.skip;

describeIfEnv("AzureCosmosDataAdapter integration", () => {
  let adapter: AzureCosmosDataAdapter;
  let databaseName: string;
  let containerName: string;

  beforeAll(async () => {
    adapter = new AzureCosmosDataAdapter(`cosmosdb://${connectionString}`);
    await adapter.authenticate();

    // discover a database and container to use for subsequent tests
    const databases = await adapter.getDatabases();
    if (databases.length > 0) {
      databaseName = databases[0].name;
      const tables = await adapter.getTables(databaseName);
      if (tables.length > 0) {
        containerName = tables[0].name;
      }
    }
  });

  test("authenticate", async () => {
    await expect(adapter.authenticate()).resolves.toBeUndefined();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBeGreaterThan(0);
    expect(databases[0].name).toBeDefined();
  });

  test("getTables", async () => {
    if (!databaseName) {
      return;
    }
    const tables = await adapter.getTables(databaseName);
    expect(tables.length).toBeGreaterThan(0);
    expect(tables[0].name).toBeDefined();
  });

  test("getColumns", async () => {
    if (!databaseName || !containerName) {
      return;
    }
    const columns = await adapter.getColumns(containerName, databaseName);
    expect(columns.length).toBeGreaterThan(0);
    expect(columns[0].name).toBeDefined();
    expect(columns[0].type).toBeDefined();
  });

  test("execute - SQL query", async () => {
    if (!databaseName || !containerName) {
      return;
    }
    const result = await adapter.execute("SELECT * FROM c OFFSET 0 LIMIT 5", databaseName, containerName);
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
    expect(Array.isArray(result.raw)).toBe(true);
  });

  test("execute - raw client query", async () => {
    if (!databaseName || !containerName) {
      return;
    }
    const result = await adapter.execute(
      `client.database('${databaseName}').container('${containerName}').items.query({ query: 'SELECT * FROM c OFFSET 0 LIMIT 2' }).fetchAll()`,
      databaseName,
      containerName,
    );
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
  });

  test("execute - create and drop database", async () => {
    const testDbName = `test-integration-${Date.now()}`;

    // create database
    const createResult = await adapter.execute(`client.databases.create({id: '${testDbName}'})`, testDbName);
    expect(createResult.ok).toBe(true);

    // verify database exists
    const databases = await adapter.getDatabases();
    const found = databases.some((db) => db.name === testDbName);
    expect(found).toBe(true);

    // drop database
    const dropResult = await adapter.execute(`client.database('${testDbName}').delete()`, testDbName);
    expect(dropResult.ok).toBe(true);
  });

  test("execute - create and drop container", async () => {
    if (!databaseName) {
      return;
    }
    const testContainerName = `test-container-${Date.now()}`;

    // create container
    const createResult = await adapter.execute(
      `client.database('${databaseName}').containers.create({id: '${testContainerName}'})`,
      databaseName,
    );
    expect(createResult.ok).toBe(true);

    // verify container exists
    const tables = await adapter.getTables(databaseName);
    const found = tables.some((t) => t.name === testContainerName);
    expect(found).toBe(true);

    // drop container
    const dropResult = await adapter.execute(
      `client.database('${databaseName}').container('${testContainerName}').delete()`,
      databaseName,
    );
    expect(dropResult.ok).toBe(true);
  });

  test("execute - error does not throw on circular JSON", async () => {
    // this tests the fix for "Converting circular structure to JSON"
    const result = await adapter.execute("invalid query that should fail");
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});
