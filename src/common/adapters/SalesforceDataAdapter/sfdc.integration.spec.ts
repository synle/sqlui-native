import SalesforceDataAdapter from "src/common/adapters/SalesforceDataAdapter/index";

const CONNECTION = process.env.TEST_SFDC_CONNECTION || "";

const describeIfConnection = CONNECTION ? describe : describe.skip;

describeIfConnection("sfdc integration", () => {
  let adapter: SalesforceDataAdapter;

  beforeAll(async () => {
    adapter = new SalesforceDataAdapter(CONNECTION);
    await adapter.authenticate();
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  test("authenticate", async () => {
    await expect(adapter.authenticate()).resolves.toBeUndefined();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBe(1);
    expect(databases[0].name).toBeDefined();
    expect(databases[0].tables).toEqual([]);
  });

  test("getTables", async () => {
    const tables = await adapter.getTables();
    expect(tables.length).toBeGreaterThan(0);
    expect(tables[0].name).toBeDefined();
    expect(tables[0].columns).toEqual([]);
  });

  test("getColumns - Account", async () => {
    const columns = await adapter.getColumns("Account");
    expect(columns.length).toBeGreaterThan(0);
    expect(columns[0].name).toBeDefined();
    expect(columns[0].type).toBeDefined();
    const idCol = columns.find((c) => c.name === "Id");
    expect(idCol).toBeDefined();
    expect(idCol!.primaryKey).toBe(true);
  });

  test("execute - SOQL query", async () => {
    const result = await adapter.execute("SELECT Id, Name FROM Account LIMIT 5");
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
    expect(Array.isArray(result.raw)).toBe(true);
  });

  test("execute - SOQL COUNT()", async () => {
    const result = await adapter.execute("SELECT COUNT() FROM Account");
    expect(result.ok).toBe(true);
  });

  test("execute - JS API describe", async () => {
    const result = await adapter.execute("conn.sobject('Account').describe()");
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
    expect(Array.isArray(result.raw)).toBe(true);
    expect(result.raw!.length).toBeGreaterThan(0);
    expect(result.raw![0].name).toBeDefined();
  });

  test("execute - error does not throw", async () => {
    const result = await adapter.execute("SELECT InvalidField FROM NonExistentObject__x");
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});
