import { getDataAdapter, resetConnectionMetaData, listAllCachedColumns, clearCachedColumns } from "src/common/adapters/DataAdapterFactory";

describe("DataAdapterFactory", () => {
  describe("getDataAdapter", () => {
    test.each([
      ["mysql://root:password@localhost:3306"],
      ["mariadb://root:password@localhost:3306"],
      ["postgres://root:password@localhost:5432"],
      ["mssql://sa:password@localhost:1433"],
      ["sqlite://path/to/db.sqlite"],
    ])("should return a RelationalDataAdapter for %s", (connection) => {
      const adapter = getDataAdapter(connection);
      expect(adapter).toBeDefined();
      expect(adapter.dialect).toBeDefined();
    });

    test("should return a CassandraDataAdapter for cassandra://", () => {
      const adapter = getDataAdapter("cassandra://localhost:9042");
      expect(adapter).toBeDefined();
      expect(adapter.dialect).toBe("cassandra");
    });

    test("should return a MongoDBDataAdapter for mongodb://", () => {
      const adapter = getDataAdapter("mongodb://localhost:27017");
      expect(adapter).toBeDefined();
      expect(adapter.dialect).toBe("mongodb");
    });

    test("should return a RedisDataAdapter for redis://", () => {
      const adapter = getDataAdapter("redis://localhost:6379");
      expect(adapter).toBeDefined();
      expect(adapter.dialect).toBe("redis");
    });

    test("should return an AzureCosmosDataAdapter for cosmosdb://", () => {
      const adapter = getDataAdapter("cosmosdb://AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=dGVzdA==;");
      expect(adapter).toBeDefined();
      expect(adapter.dialect).toBe("cosmosdb");
    });

    test("should return an AzureTableStorageAdapter for aztable://", () => {
      const adapter = getDataAdapter(
        "aztable://DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net",
      );
      expect(adapter).toBeDefined();
      expect(adapter.dialect).toBe("aztable");
    });

    test("should return a SalesforceDataAdapter for sfdc://", () => {
      const adapter = getDataAdapter(
        'sfdc://{"username":"test","password":"test","securityToken":"test","loginUrl":"https://test.salesforce.com"}',
      );
      expect(adapter).toBeDefined();
      expect(adapter.dialect).toBe("sfdc");
    });

    test("should throw for unsupported dialect", () => {
      expect(() => getDataAdapter("unknown://host")).toThrow();
    });
  });

  describe("resetConnectionMetaData", () => {
    test("should return offline metadata with empty databases", () => {
      const connection = {
        id: "conn-1",
        name: "Acme DB",
        connection: "mysql://root:password@localhost:3306",
      };
      const result = resetConnectionMetaData(connection);

      expect(result.id).toBe("conn-1");
      expect(result.name).toBe("Acme DB");
      expect(result.connection).toBe("mysql://root:password@localhost:3306");
      expect(result.status).toBe("offline");
      expect(result.databases).toEqual([]);
    });
  });

  describe("listAllCachedColumns", () => {
    test("should return an array", () => {
      const result = listAllCachedColumns();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("clearCachedColumns", () => {
    test("should not throw for any connectionId", () => {
      expect(() => clearCachedColumns("nonexistent-connection")).not.toThrow();
    });
  });
});
