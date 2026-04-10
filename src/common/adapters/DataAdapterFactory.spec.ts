import {
  getDataAdapter,
  resetConnectionMetaData,
  listAllCachedColumns,
  clearCachedColumns,
  clearCachedDatabase,
  clearCachedTable,
  listCachedColumnsByDatabase,
  getCachedSchema,
} from "src/common/adapters/DataAdapterFactory";
import PersistentStorage from "src/common/PersistentStorage";

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

describe("DataAdapterFactory caching", () => {
  const databaseCacheStorage = new PersistentStorage<any>("cache", "databases", "cache.databases");
  const tableCacheStorage = new PersistentStorage<any>("cache", "tables", "cache.tables");
  const columnCacheStorage = new PersistentStorage<any>("cache", "columns", "cache.columns");

  const TEST_CONN_ID = "test-conn-cache-spec";
  const TEST_DB_ID = "acme_db";
  const TEST_TABLE_ID = "users";
  const TEST_TABLE_ID_2 = "orders";

  const mockDatabases = [{ name: "acme_db", tables: [] }];
  const mockTables = [
    { name: "users", columns: [] },
    { name: "orders", columns: [] },
  ];
  const mockColumns = [
    { name: "id", type: "int", primaryKey: true },
    { name: "email", type: "varchar" },
  ];
  const mockColumns2 = [
    { name: "order_id", type: "int", primaryKey: true },
    { name: "total", type: "decimal" },
  ];

  function seedDatabaseCache(connectionId: string, data: any[]) {
    databaseCacheStorage.add({ id: `databases:${connectionId}`, data, timestamp: Date.now() });
  }

  function seedTableCache(connectionId: string, databaseId: string, data: any[]) {
    tableCacheStorage.add({ id: `tables:${connectionId}:${databaseId}`, data, timestamp: Date.now() });
  }

  function seedColumnCache(connectionId: string, databaseId: string, tableId: string, data: any[]) {
    columnCacheStorage.add({ id: `${connectionId}:${databaseId}:${tableId}`, data, timestamp: Date.now() });
  }

  function cleanupTestCaches() {
    try {
      databaseCacheStorage.delete(`databases:${TEST_CONN_ID}`);
    } catch (_err) {}
    try {
      tableCacheStorage.delete(`tables:${TEST_CONN_ID}:${TEST_DB_ID}`);
    } catch (_err) {}
    try {
      columnCacheStorage.delete(`${TEST_CONN_ID}:${TEST_DB_ID}:${TEST_TABLE_ID}`);
    } catch (_err) {}
    try {
      columnCacheStorage.delete(`${TEST_CONN_ID}:${TEST_DB_ID}:${TEST_TABLE_ID_2}`);
    } catch (_err) {}
  }

  beforeEach(() => {
    cleanupTestCaches();
  });

  afterAll(() => {
    cleanupTestCaches();
  });

  describe("setCachedDatabases + getCachedDatabases (via getCachedSchema)", () => {
    test("should return empty databases when no cache exists", () => {
      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.databases).toEqual([]);
    });

    test("should return cached databases after seeding", () => {
      seedDatabaseCache(TEST_CONN_ID, mockDatabases);
      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.databases).toEqual(mockDatabases);
    });
  });

  describe("setCachedTables + getCachedTables (via getCachedSchema)", () => {
    test("should return empty tables when no cache exists", () => {
      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.tables).toEqual([]);
    });

    test("should return cached tables after seeding", () => {
      seedTableCache(TEST_CONN_ID, TEST_DB_ID, mockTables);
      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.tables).toEqual(mockTables);
    });
  });

  describe("setCachedColumns + getCachedColumns (via getCachedSchema)", () => {
    test("should return empty columns when no cache exists", () => {
      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.columns).toEqual({});
    });

    test("should return cached columns keyed by table after seeding", () => {
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);
      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.columns[TEST_TABLE_ID]).toEqual(mockColumns);
    });

    test("should return columns for multiple tables", () => {
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID_2, mockColumns2);
      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.columns[TEST_TABLE_ID]).toEqual(mockColumns);
      expect(schema.columns[TEST_TABLE_ID_2]).toEqual(mockColumns2);
    });
  });

  describe("listCachedColumnsByDatabase", () => {
    test("should return empty record when no columns cached", () => {
      const result = listCachedColumnsByDatabase(TEST_CONN_ID, TEST_DB_ID);
      expect(result).toEqual({});
    });

    test("should return columns keyed by table name", () => {
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID_2, mockColumns2);
      const result = listCachedColumnsByDatabase(TEST_CONN_ID, TEST_DB_ID);
      expect(Object.keys(result)).toContain(TEST_TABLE_ID);
      expect(Object.keys(result)).toContain(TEST_TABLE_ID_2);
      expect(result[TEST_TABLE_ID]).toEqual(mockColumns);
      expect(result[TEST_TABLE_ID_2]).toEqual(mockColumns2);
    });

    test("should not return columns from a different database", () => {
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);
      seedColumnCache(TEST_CONN_ID, "other_db", "other_table", mockColumns2);
      const result = listCachedColumnsByDatabase(TEST_CONN_ID, TEST_DB_ID);
      expect(Object.keys(result)).toContain(TEST_TABLE_ID);
      expect(Object.keys(result)).not.toContain("other_table");
      // cleanup extra entry
      try {
        columnCacheStorage.delete(`${TEST_CONN_ID}:other_db:other_table`);
      } catch (_err) {}
    });

    test("should not return columns from a different connection", () => {
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);
      seedColumnCache("other-conn", TEST_DB_ID, TEST_TABLE_ID, mockColumns2);
      const result = listCachedColumnsByDatabase(TEST_CONN_ID, TEST_DB_ID);
      expect(result[TEST_TABLE_ID]).toEqual(mockColumns);
      // cleanup extra entry
      try {
        columnCacheStorage.delete(`other-conn:${TEST_DB_ID}:${TEST_TABLE_ID}`);
      } catch (_err) {}
    });
  });

  describe("getCachedSchema", () => {
    test("should return all empty when nothing is cached", () => {
      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.databases).toEqual([]);
      expect(schema.tables).toEqual([]);
      expect(schema.columns).toEqual({});
    });

    test("should return consolidated schema with databases, tables, and columns", () => {
      seedDatabaseCache(TEST_CONN_ID, mockDatabases);
      seedTableCache(TEST_CONN_ID, TEST_DB_ID, mockTables);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID_2, mockColumns2);

      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.databases).toEqual(mockDatabases);
      expect(schema.tables).toEqual(mockTables);
      expect(schema.columns[TEST_TABLE_ID]).toEqual(mockColumns);
      expect(schema.columns[TEST_TABLE_ID_2]).toEqual(mockColumns2);
    });

    test("should return partial schema when only some caches are populated", () => {
      seedDatabaseCache(TEST_CONN_ID, mockDatabases);
      // no tables or columns seeded
      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.databases).toEqual(mockDatabases);
      expect(schema.tables).toEqual([]);
      expect(schema.columns).toEqual({});
    });
  });

  describe("clearCachedColumns", () => {
    test("should clear all caches for a connection", () => {
      seedDatabaseCache(TEST_CONN_ID, mockDatabases);
      seedTableCache(TEST_CONN_ID, TEST_DB_ID, mockTables);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);

      clearCachedColumns(TEST_CONN_ID);

      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.databases).toEqual([]);
      expect(schema.tables).toEqual([]);
      expect(schema.columns).toEqual({});
    });

    test("should not affect caches for a different connection", () => {
      const otherConn = "test-conn-other";
      seedDatabaseCache(TEST_CONN_ID, mockDatabases);
      seedDatabaseCache(otherConn, [{ name: "other_db", tables: [] }]);

      clearCachedColumns(TEST_CONN_ID);

      const otherSchema = getCachedSchema(otherConn, "other_db");
      expect(otherSchema.databases).toEqual([{ name: "other_db", tables: [] }]);
      // cleanup
      try {
        databaseCacheStorage.delete(`databases:${otherConn}`);
      } catch (_err) {}
    });

    test("should not throw when clearing non-existent connection", () => {
      expect(() => clearCachedColumns("nonexistent-conn-xyz")).not.toThrow();
    });
  });

  describe("clearCachedDatabase", () => {
    test("should clear table and column caches for a specific database", () => {
      seedTableCache(TEST_CONN_ID, TEST_DB_ID, mockTables);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID_2, mockColumns2);

      clearCachedDatabase(TEST_CONN_ID, TEST_DB_ID);

      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.tables).toEqual([]);
      expect(schema.columns).toEqual({});
    });

    test("should preserve database cache (only clears tables and columns)", () => {
      seedDatabaseCache(TEST_CONN_ID, mockDatabases);
      seedTableCache(TEST_CONN_ID, TEST_DB_ID, mockTables);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);

      clearCachedDatabase(TEST_CONN_ID, TEST_DB_ID);

      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.databases).toEqual(mockDatabases);
      expect(schema.tables).toEqual([]);
      expect(schema.columns).toEqual({});
    });

    test("should not affect other databases in the same connection", () => {
      const otherDb = "globex_db";
      seedTableCache(TEST_CONN_ID, TEST_DB_ID, mockTables);
      seedTableCache(TEST_CONN_ID, otherDb, [{ name: "products", columns: [] }]);
      seedColumnCache(TEST_CONN_ID, otherDb, "products", [{ name: "sku", type: "varchar" }]);

      clearCachedDatabase(TEST_CONN_ID, TEST_DB_ID);

      const otherSchema = getCachedSchema(TEST_CONN_ID, otherDb);
      expect(otherSchema.tables).toEqual([{ name: "products", columns: [] }]);
      expect(otherSchema.columns["products"]).toEqual([{ name: "sku", type: "varchar" }]);
      // cleanup
      try {
        tableCacheStorage.delete(`tables:${TEST_CONN_ID}:${otherDb}`);
        columnCacheStorage.delete(`${TEST_CONN_ID}:${otherDb}:products`);
      } catch (_err) {}
    });

    test("should not throw when clearing non-existent database", () => {
      expect(() => clearCachedDatabase(TEST_CONN_ID, "nonexistent-db")).not.toThrow();
    });
  });

  describe("clearCachedTable", () => {
    test("should clear column cache for a specific table", () => {
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID_2, mockColumns2);

      clearCachedTable(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID);

      const columns = listCachedColumnsByDatabase(TEST_CONN_ID, TEST_DB_ID);
      expect(columns[TEST_TABLE_ID]).toBeUndefined();
      expect(columns[TEST_TABLE_ID_2]).toEqual(mockColumns2);
    });

    test("should preserve table cache when clearing a table's columns", () => {
      seedTableCache(TEST_CONN_ID, TEST_DB_ID, mockTables);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);

      clearCachedTable(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID);

      const schema = getCachedSchema(TEST_CONN_ID, TEST_DB_ID);
      expect(schema.tables).toEqual(mockTables);
      expect(schema.columns[TEST_TABLE_ID]).toBeUndefined();
    });

    test("should not throw when clearing non-existent table", () => {
      expect(() => clearCachedTable(TEST_CONN_ID, TEST_DB_ID, "nonexistent-table")).not.toThrow();
    });
  });

  describe("listAllCachedColumns", () => {
    test("should include seeded column entries", () => {
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);

      const allColumns = listAllCachedColumns();
      expect(Array.isArray(allColumns)).toBe(true);

      const match = allColumns.find((entry) => entry.id === `${TEST_CONN_ID}:${TEST_DB_ID}:${TEST_TABLE_ID}`);
      expect(match).toBeDefined();
      expect(match!.data).toEqual(mockColumns);
    });

    test("should return entries for multiple tables", () => {
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID, mockColumns);
      seedColumnCache(TEST_CONN_ID, TEST_DB_ID, TEST_TABLE_ID_2, mockColumns2);

      const allColumns = listAllCachedColumns();
      const ids = allColumns.map((entry) => entry.id);
      expect(ids).toContain(`${TEST_CONN_ID}:${TEST_DB_ID}:${TEST_TABLE_ID}`);
      expect(ids).toContain(`${TEST_CONN_ID}:${TEST_DB_ID}:${TEST_TABLE_ID_2}`);
    });
  });

  describe("resetConnectionMetaData", () => {
    test("should always return offline status with no databases regardless of cache state", () => {
      seedDatabaseCache(TEST_CONN_ID, mockDatabases);

      const result = resetConnectionMetaData({
        id: TEST_CONN_ID,
        name: "Acme Test",
        connection: "mysql://root:password@localhost:3306",
      });
      expect(result.status).toBe("offline");
      expect(result.databases).toEqual([]);
    });

    test("should preserve connection properties in the returned metadata", () => {
      const result = resetConnectionMetaData({
        id: "initech-conn",
        name: "Initech Production",
        connection: "postgres://admin:secret@db.initech.com:5432",
      });
      expect(result.id).toBe("initech-conn");
      expect(result.name).toBe("Initech Production");
      expect(result.connection).toBe("postgres://admin:secret@db.initech.com:5432");
    });
  });
});
