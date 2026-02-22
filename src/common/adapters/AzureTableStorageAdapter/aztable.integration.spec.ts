import AzureTableStorageAdapter from "src/common/adapters/AzureTableStorageAdapter/index";

const connectionString = process.env.TEST_AZ_TABLE_STORAGE_CONNECTION;

const shouldRun = !!connectionString;

const describeIfEnv = shouldRun ? describe : describe.skip;

describeIfEnv("AzureTableStorageAdapter integration", () => {
  let adapter: AzureTableStorageAdapter;
  const testTableName = `testintegration${Date.now()}`;

  beforeAll(async () => {
    adapter = new AzureTableStorageAdapter(connectionString!);
    await adapter.authenticate();
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

  test("execute - create table", async () => {
    const result = await adapter.execute(
      `serviceClient.createTable('${testTableName}')`,
      "Azure Table Storage",
      testTableName,
    );
    expect(result.ok).toBe(true);
  });

  test("getTables - should include created table", async () => {
    const tables = await adapter.getTables();
    expect(tables.length).toBeGreaterThan(0);
    const found = tables.some((t) => t.name === testTableName);
    expect(found).toBe(true);
  });

  test("execute - insert entity", async () => {
    const result = await adapter.execute(
      `tableClient.createEntity({\n  "rowKey": "row1",\n  "partitionKey": "partition1"\n})`,
      "Azure Table Storage",
      testTableName,
    );
    expect(result.ok).toBe(true);
  });

  test("execute - select all entities", async () => {
    const result = await adapter.execute(
      `tableClient.listEntities({\n  queryOptions: {\n    filter: \`\`\n  }\n})`,
      "Azure Table Storage",
      testTableName,
    );
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
    expect(Array.isArray(result.raw)).toBe(true);
    expect(result.raw!.length).toBeGreaterThan(0);
  });

  test("execute - select with filter", async () => {
    const result = await adapter.execute(
      `tableClient.listEntities({\n  queryOptions: {\n    filter: \`PartitionKey eq 'partition1'\`,\n    select: ["rowKey", "partitionKey", "etag", "timestamp"]\n  }\n})`,
      "Azure Table Storage",
      testTableName,
    );
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
    expect(Array.isArray(result.raw)).toBe(true);
    expect(result.raw!.length).toBeGreaterThan(0);
  });

  test("execute - update entity", async () => {
    const result = await adapter.execute(
      `tableClient.updateEntity({\n  "rowKey": "row1",\n  "partitionKey": "partition1"\n})`,
      "Azure Table Storage",
      testTableName,
    );
    expect(result.ok).toBe(true);
  });

  test("execute - upsert entity", async () => {
    const result = await adapter.execute(
      `tableClient.upsertEntity({\n  "rowKey": "row2",\n  "partitionKey": "partition1"\n}, 'Replace')`,
      "Azure Table Storage",
      testTableName,
    );
    expect(result.ok).toBe(true);
  });

  test("getColumns - should return columns from test table", async () => {
    const columns = await adapter.getColumns(testTableName);
    expect(columns.length).toBeGreaterThan(0);
    expect(columns[0].name).toBeDefined();
  });

  test("execute - delete entity", async () => {
    const result = await adapter.execute(
      `tableClient.deleteEntity('partition1', 'row1')`,
      "Azure Table Storage",
      testTableName,
    );
    expect(result.ok).toBe(true);
  });

  test("execute - delete second entity", async () => {
    const result = await adapter.execute(
      `tableClient.deleteEntity('partition1', 'row2')`,
      "Azure Table Storage",
      testTableName,
    );
    expect(result.ok).toBe(true);
  });

  test("execute - drop table", async () => {
    const result = await adapter.execute(
      `serviceClient.deleteTable('${testTableName}')`,
      "Azure Table Storage",
      testTableName,
    );
    expect(result.ok).toBe(true);
  });

  test("execute - error does not throw", async () => {
    const result = await adapter.execute("invalid query that should fail");
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe.skip("aztable legacy", () => {
  const azTableConnectionString = process.env.AZTABLE_CONNECTION_STRING;
  const adapter = new AzureTableStorageAdapter(`aztable://${azTableConnectionString}`);

  test("Authenticate", async () => {
    await adapter.authenticate();
  });

  test("getDatabases", async () => {
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

  test("getTables", async () => {
    const actual = await adapter.getTables();
    expect(actual.length).toBeGreaterThan(0);
    expect(actual[0].name).toBeDefined();
  });

  test("getColumns", async () => {
    const actual = await adapter.getColumns("syaztabl1");
    expect(actual.length).toBeGreaterThan(0);
    expect(actual[0].name).toBeDefined();
  });

  test("execute list data", async () => {
    const actual = await adapter.execute("tableClient.listEntities()", "Azure Table Storage", "syaztabl1");
    expect(actual?.raw?.length).toBeGreaterThan(0);
    expect(actual?.raw?.[0]?.etag).toBeDefined();
    expect(actual?.raw?.[0]?.partitionKey).toBeDefined();
    expect(actual?.raw?.[0]?.rowKey).toBeDefined();
    expect(actual?.raw?.[0]?.timestamp).toBeDefined();
  });
});
