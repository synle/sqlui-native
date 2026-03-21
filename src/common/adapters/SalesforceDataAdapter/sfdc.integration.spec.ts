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

  test("getTables", async () => {
    const tables = await adapter.getTables();
    expect(tables.length).toBeGreaterThan(0);
    expect(tables[0].name).toBeDefined();
  });
});
