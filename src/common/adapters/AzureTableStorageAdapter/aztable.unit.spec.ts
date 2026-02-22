import { vi } from "vitest";

const mockGetProperties = vi.fn().mockResolvedValue({ logging: {} });
const mockListTables = vi.fn();
const mockListEntities = vi.fn();

vi.mock("@azure/data-tables", () => ({
  TableServiceClient: {
    fromConnectionString: vi.fn().mockImplementation(() => ({
      getProperties: mockGetProperties,
      listTables: mockListTables,
    })),
  },
  TableClient: {
    fromConnectionString: vi.fn().mockImplementation(() => ({
      listEntities: mockListEntities,
    })),
  },
}));

import AzureTableStorageAdapter from "src/common/adapters/AzureTableStorageAdapter/index";

describe("AzureTableStorageAdapter unit", () => {
  let adapter: AzureTableStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new AzureTableStorageAdapter(
      "aztable://DefaultEndpointsProtocol=https;AccountName=mock;AccountKey=mockKey==;EndpointSuffix=core.windows.net",
    );
  });

  test("authenticate", async () => {
    await adapter.authenticate();
    expect(mockGetProperties).toHaveBeenCalled();
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
    const tableIterator = (async function* () {
      yield { name: "table1" };
      yield { name: "table2" };
    })();
    mockListTables.mockReturnValue(tableIterator);

    const tables = await adapter.getTables();
    expect(tables.length).toBe(2);
    expect(tables[0].name).toBe("table1");
    expect(tables[1].name).toBe("table2");
  });

  test("getColumns", async () => {
    const entityIterator = [{ rowKey: "row1", partitionKey: "pk1", etag: "etag1", timestamp: "2024-01-01" }];
    const pageIterator = {
      next: vi.fn().mockResolvedValue({
        done: false,
        value: entityIterator,
      }),
    };
    mockListEntities.mockReturnValue({
      byPage: () => pageIterator,
    });

    const columns = await adapter.getColumns("table1");
    expect(columns.length).toBeGreaterThan(0);
    const names = columns.map((c) => c.name);
    expect(names).toContain("rowKey");
    expect(names).toContain("partitionKey");
    const rowKeyCol = columns.find((c) => c.name === "rowKey");
    expect(rowKeyCol?.primaryKey).toBe(true);
  });

  test("execute error", async () => {
    const resp = await adapter.execute("invalid query that should fail");
    expect(resp.ok).toBe(false);
    expect(resp.error).toBeDefined();
  });
});
