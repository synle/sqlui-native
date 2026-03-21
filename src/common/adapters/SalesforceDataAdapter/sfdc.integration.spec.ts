import SalesforceDataAdapter from "src/common/adapters/SalesforceDataAdapter/index";

const CONNECTION = process.env.TEST_SFDC_CONNECTION || "";

const describeIfConnection = CONNECTION ? describe : describe.skip;

describeIfConnection("sfdc integration", () => {
  let adapter: SalesforceDataAdapter;

  beforeAll(() => {
    adapter = new SalesforceDataAdapter(CONNECTION);
  });

  afterAll(async () => {
    await adapter.disconnect();
  });

  test("authenticate", async () => {
    await adapter.authenticate();
  });

  test("getDatabases", async () => {
    const databases = await adapter.getDatabases();
    expect(databases.length).toBe(1);
    expect(databases[0].name).toBeDefined();
  });

  test("getTables", async () => {
    const tables = await adapter.getTables();
    expect(tables.length).toBeGreaterThan(0);
    expect(tables[0].name).toBeDefined();
  });

  test("getColumns", async () => {
    const columns = await adapter.getColumns("Account");
    expect(columns.length).toBeGreaterThan(0);
    expect(columns.find((c) => c.name === "Id")).toBeDefined();
  });

  test("execute SOQL", async () => {
    const result = await adapter.execute("SELECT Id, Name FROM Account LIMIT 5");
    expect(result.ok).toBe(true);
    expect(result.raw).toBeDefined();
  });
});
