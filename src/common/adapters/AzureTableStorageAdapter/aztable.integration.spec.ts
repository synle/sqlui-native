import AzureTableStorageAdapter from "src/common/adapters/AzureTableStorageAdapter/index";

const connectionString = process.env.TEST_AZ_TABLE_STORAGE_CONNECTION;

const shouldRun = !!connectionString;

const describeIfEnv = shouldRun ? describe : describe.skip;

describeIfEnv("AzureTableStorageAdapter integration", () => {
  let adapter: AzureTableStorageAdapter;
  let tableName: string;

  beforeAll(async () => {
    adapter = new AzureTableStorageAdapter(`aztable://${connectionString}`);
    await adapter.authenticate();

    // discover a table to use for subsequent tests
    const tables = await adapter.getTables();
    if (tables.length > 0) {
      tableName = tables[0].name;
    }
  });

  test("authenticate", async () => {
    await expect(adapter.authenticate()).resolves.toBeUndefined();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases).toEqual([
      {
        name: "Azure Table Storage",
        tables: [],
      },
    ]);
  });

  test("getTables", async () => {
    const tables = await adapter.getTables();
    expect(tables.length).toBeGreaterThan(0);
    expect(tables[0].name).toBeDefined();
  });

  test("getColumns", async () => {
    if (!tableName) {
      return;
    }
    const columns = await adapter.getColumns(tableName);
    expect(columns.length).toBeGreaterThan(0);
    expect(columns[0].name).toBeDefined();
  });

  test("execute - list entities", async () => {
    if (!tableName) {
      return;
    }
    const result = await adapter.execute("tableClient.listEntities()", "Azure Table Storage", tableName);
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
    expect(Array.isArray(result.raw)).toBe(true);
  });

  test("execute - create and drop table", async () => {
    const testTableName = `testintegration${Date.now()}`;

    // create table
    const createResult = await adapter.execute(
      `serviceClient.createTable('${testTableName}')`,
      "Azure Table Storage",
      testTableName,
    );
    expect(createResult.ok).toBe(true);

    // verify table exists
    const tables = await adapter.getTables();
    const found = tables.some((t) => t.name === testTableName);
    expect(found).toBe(true);

    // drop table
    const dropResult = await adapter.execute(
      `serviceClient.deleteTable('${testTableName}')`,
      "Azure Table Storage",
      testTableName,
    );
    expect(dropResult.ok).toBe(true);
  });
});
