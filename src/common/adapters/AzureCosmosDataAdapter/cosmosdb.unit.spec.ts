import { vi } from "vitest";

const mockDispose = vi.fn();
const mockGetReadEndpoint = vi.fn().mockResolvedValue("https://mock-endpoint.documents.azure.com");
const mockDatabasesReadAll = vi.fn();
const mockContainersReadAll = vi.fn();
const mockItemsQuery = vi.fn();

vi.mock("@azure/cosmos", () => ({
  CosmosClient: vi.fn().mockImplementation(() => ({
    dispose: mockDispose,
    getReadEndpoint: mockGetReadEndpoint,
    databases: {
      readAll: () => ({
        fetchAll: mockDatabasesReadAll,
      }),
    },
    database: vi.fn().mockImplementation(() => ({
      containers: {
        readAll: () => ({
          fetchAll: mockContainersReadAll,
        }),
      },
      container: vi.fn().mockImplementation(() => ({
        items: {
          query: () => ({
            fetchAll: mockItemsQuery,
          }),
        },
      })),
    })),
  })),
}));

import AzureCosmosDataAdapter from "src/common/adapters/AzureCosmosDataAdapter/index";

describe("AzureCosmosDataAdapter unit", () => {
  let adapter: AzureCosmosDataAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new AzureCosmosDataAdapter("cosmosdb://AccountEndpoint=https://mock.documents.azure.com:443/;AccountKey=mockKey==;");
  });

  test("authenticate", async () => {
    mockDatabasesReadAll.mockResolvedValue({
      resources: [{ id: "test_db" }],
    });
    await adapter.authenticate();
    expect(mockGetReadEndpoint).toHaveBeenCalled();
  });

  test("getDatabases", async () => {
    mockDatabasesReadAll.mockResolvedValue({
      resources: [{ id: "db1" }, { id: "db2" }],
    });
    const databases = await adapter.getDatabases();
    expect(databases.length).toBe(2);
    expect(databases[0].name).toBe("db1");
    expect(databases[1].name).toBe("db2");
  });

  test("getTables", async () => {
    mockContainersReadAll.mockResolvedValue({
      resources: [{ id: "container1" }, { id: "container2" }],
    });
    const tables = await adapter.getTables("db1");
    expect(tables.length).toBe(2);
    expect(tables[0].name).toBe("container1");
    expect(tables[1].name).toBe("container2");
  });

  test("getTables requires database", async () => {
    await expect(adapter.getTables()).rejects.toThrow("Database is a required field");
  });

  test("getColumns", async () => {
    mockItemsQuery.mockResolvedValue({
      resources: [{ id: "item1", name: "Test", count: 42 }],
    });
    const columns = await adapter.getColumns("container1", "db1");
    expect(columns.length).toBeGreaterThan(0);
    const names = columns.map((c) => c.name);
    expect(names).toContain("id");
    expect(names).toContain("name");
    expect(names).toContain("count");
    const idCol = columns.find((c) => c.name === "id");
    expect(idCol?.primaryKey).toBe(true);
  });

  test("execute SQL query", async () => {
    mockItemsQuery.mockResolvedValue({
      resources: [{ id: "1", name: "Test" }],
    });
    const resp = await adapter.execute("SELECT * FROM c", "db1", "container1");
    expect(resp.ok).toBe(true);
    expect(resp.raw).toEqual([{ id: "1", name: "Test" }]);
  });

  test("execute error", async () => {
    mockItemsQuery.mockRejectedValue(new Error("Query failed"));
    const resp = await adapter.execute("SELECT * FROM c", "db1", "container1");
    expect(resp.ok).toBe(false);
    expect(resp.error).toBeDefined();
  });
});
