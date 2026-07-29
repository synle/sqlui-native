import { vi, describe, test, expect, beforeEach } from "vitest";

const mockDispose = vi.fn();
const mockGetReadEndpoint = vi.fn().mockResolvedValue("");
const mockDatabasesReadAll = vi.fn();
const mockContainersReadAll = vi.fn();
const mockItemsQuery = vi.fn();

vi.mock("@azure/cosmos", () => ({
  CosmosClient: vi.fn().mockImplementation(function () {
    return {
      dispose: mockDispose,
      getReadEndpoint: mockGetReadEndpoint,
      databases: {
        readAll: () => ({ fetchAll: mockDatabasesReadAll }),
      },
      database: vi.fn().mockImplementation(() => ({
        containers: { readAll: () => ({ fetchAll: mockContainersReadAll }) },
        container: vi.fn().mockImplementation(() => ({
          items: { query: () => ({ fetchAll: mockItemsQuery }) },
        })),
      })),
    };
  }),
}));

import AzureCosmosDataAdapter from "src/common/adapters/AzureCosmosDataAdapter/index";

const validConn =
  "cosmosdb://AccountEndpoint=https://mock.documents.azure.com:443/;AccountKey=mockKey==;";

describe("AzureCosmosDataAdapter extra", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetReadEndpoint.mockResolvedValue("https://mock-endpoint.documents.azure.com");
  });

  test("authenticate rejects with empty read endpoint", async () => {
    mockGetReadEndpoint.mockResolvedValueOnce("");
    mockDatabasesReadAll.mockResolvedValue({ resources: [] });
    const a = new AzureCosmosDataAdapter(validConn);
    await expect(a.authenticate()).rejects.toBeDefined();
  });

  test("getDatabases returns [] on error", async () => {
    mockDatabasesReadAll.mockRejectedValueOnce(new Error("network"));
    const a = new AzureCosmosDataAdapter(validConn);
    await expect(a.getDatabases()).resolves.toEqual([]);
  });

  test("getTables returns [] on error", async () => {
    mockContainersReadAll.mockRejectedValueOnce(new Error("network"));
    const a = new AzureCosmosDataAdapter(validConn);
    await expect(a.getTables("db1")).resolves.toEqual([]);
  });

  test("getColumns requires database", async () => {
    const a = new AzureCosmosDataAdapter(validConn);
    await expect(a.getColumns("container1")).rejects.toThrow(/Database is a required/);
  });

  test("getColumns returns [] on error", async () => {
    mockItemsQuery.mockRejectedValueOnce(new Error("query failed"));
    const a = new AzureCosmosDataAdapter(validConn);
    await expect(a.getColumns("c", "d")).resolves.toEqual([]);
  });

  test("execute requires table+database in raw SQL mode", async () => {
    const a = new AzureCosmosDataAdapter(validConn);
    const r1 = await a.execute("SELECT * FROM c");
    expect(r1.ok).toBe(false);
    const r2 = await a.execute("SELECT * FROM c", undefined, "container");
    expect(r2.ok).toBe(false);
  });

  test("disconnect calls dispose and ignores errors", async () => {
    mockDispose.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const a = new AzureCosmosDataAdapter(validConn);
    await a.authenticate(); // sets _connection
    await expect(a.disconnect()).resolves.toBeUndefined();
  });
});
