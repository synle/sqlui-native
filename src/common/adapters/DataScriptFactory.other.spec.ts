import {
  consolidateDialects,
  getAllImplementations,
  getCodeSnippet,
  getConnectionFormInputs,
  getConnectionSetupGuide,
  getConnectionStringFormat,
  getDialectIcon,
  getDialectName,
  getDialectType,
  getDialectTypeFromConnectionString,
  getIsTableIdRequiredForQueryByDialect,
  getSampleConnectionString,
  getSampleSelectQuery,
  getSyntaxModeByDialect,
  isDialectSupportCreateRecordForm,
  isDialectSupportEditRecordForm,
  isDialectSupportMigration,
  isDialectSupportVisualization,
  SUPPORTED_DIALECTS,
} from "src/common/adapters/DataScriptFactory";

describe("DataScriptFactory - Other Tests", () => {
  describe("getAllImplementations and consolidateDialects should work properly", () => {
    test("Should not have any overlapping dialect schemes", async () => {
      const allDialects = getAllImplementations().reduce<string[]>(consolidateDialects, []);
      const uniqueDialects = [...new Set(allDialects)];
      expect(allDialects).toStrictEqual(uniqueDialects);
      expect(allDialects.length > 0).toBe(true);
    });
  });

  describe("getDialectType", () => {
    test("bogus", async () => {
      const input1 = `bogus://AccountEndpoint=some_cosmos_endpoint;AccountKey=some_cosmos_account_key`;
      expect(getDialectType(input1)).toMatchInlineSnapshot(`undefined`);

      const input2 = `bogus://username:password@localhost:9042`;
      expect(getDialectType(input2)).toMatchInlineSnapshot(`undefined`);

      const input3 = `bogus1+bogus2://username:password@localhost:9042`;
      expect(getDialectType(input3)).toMatchInlineSnapshot(`undefined`);
    });

    test("cosmosdb", async () => {
      const input = `cosmosdb://AccountEndpoint=some_cosmos_endpoint;AccountKey=some_cosmos_account_key`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"cosmosdb"`);
    });

    test("aztable", async () => {
      const input = `aztable://DefaultEndpointsProtocol=https;AccountName=<your_account_name>;AccountKey=<your_account_key>;EndpointSuffix=core.windows.net`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"aztable"`);
    });

    test("cassandra", async () => {
      const input = `cassandra://username:password@localhost:9042`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"cassandra"`);
    });

    test("mongodb", async () => {
      const input = `mongodb://localhost:27017`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"mongodb"`);
    });

    test("mongodb", async () => {
      const input = `mongodb+srv://localhost:27017`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"mongodb"`);
    });

    test("mssql", async () => {
      const input = `mssql://sa:password123!@localhost:1433`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"mssql"`);
    });

    test("postgres", async () => {
      const input = `postgres://postgres:password@localhost:5432`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"postgres"`);
    });

    test("sqlite", async () => {
      const input = `sqlite://test-db.sqlite`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"sqlite"`);
    });

    test("mariadb", async () => {
      const input = `mariadb://root:password@localhost:3306`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"mariadb"`);
    });

    test("mysql", async () => {
      const input = `mysql://root:password@localhost:3306`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"mysql"`);
    });

    test("redis", async () => {
      const input = `redis://localhost:6379`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"redis"`);
    });

    test("rediss", async () => {
      const input = `rediss://username:password@localhost:6379`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"rediss"`);
    });

    test("sfdc", async () => {
      const input = `sfdc://{"username":"user@example.com","password":"pass","securityToken":"token"}`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"sfdc"`);
    });
  });

  describe("getDialectName", () => {
    test("undefined", async () => {
      const input = undefined;
      expect(getDialectName(input)).toMatchInlineSnapshot(`""`);
    });

    test("bogus", async () => {
      const input = `bogus`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`""`);
    });

    test("cosmosdb", async () => {
      const input = `cosmosdb`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Azure Cosmos DB"`);
    });

    test("aztable", async () => {
      const input = `aztable`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Azure Table Storage"`);
    });

    test("cassandra", async () => {
      const input = `cassandra`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Cassandra"`);
    });

    test("mongodb", async () => {
      const input = `mongodb`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Mongodb"`);
    });

    test("mongodb", async () => {
      const input = `mongodb+srv`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Mongodb+srv"`);
    });

    test("mssql", async () => {
      const input = `mssql`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Mssql"`);
    });

    test("postgres", async () => {
      const input = `postgres`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Postgres"`);
    });

    test("sqlite", async () => {
      const input = `sqlite`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Sqlite"`);
    });

    test("mariadb", async () => {
      const input = `mariadb`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Mariadb"`);
    });

    test("mysql", async () => {
      const input = `mysql`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Mysql"`);
    });

    test("redis", async () => {
      const input = `redis`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Redis"`);
    });

    test("rediss", async () => {
      const input = `rediss`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Redis with SSL"`);
    });

    test("sfdc", async () => {
      const input = `sfdc`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Salesforce"`);
    });
  });

  describe("getDialectIcon", () => {
    test("undefined", async () => {
      const input = undefined;
      expect(getDialectIcon(input)).toMatchInlineSnapshot(`""`);
    });

    test("bogus", async () => {
      const input = `bogus`;
      expect(getDialectIcon(input)).toMatchInlineSnapshot(`""`);
    });

    test("cosmosdb", async () => {
      const input = `cosmosdb`;
      expect(getDialectIcon(input)).toContain(`/cosmosdb.png`);
    });

    test("aztable", async () => {
      const input = `aztable`;
      expect(getDialectIcon(input)).toContain(`/aztable.png`);
    });

    test("cassandra", async () => {
      const input = `cassandra`;
      expect(getDialectIcon(input)).toContain(`/cassandra.png`);
    });

    test("mongodb", async () => {
      const input = `mongodb`;
      expect(getDialectIcon(input)).toContain(`/mongodb.png`);
    });

    test("mongodb", async () => {
      const input = `mongodb+srv`;
      expect(getDialectIcon(input)).toContain(`/mongodb.png`);
    });

    test("mssql", async () => {
      const input = `mssql`;
      expect(getDialectIcon(input)).toContain(`/mssql.png`);
    });

    test("postgres", async () => {
      const input = `postgres`;
      expect(getDialectIcon(input)).toContain(`/postgres.png`);
    });

    test("sqlite", async () => {
      const input = `sqlite`;
      expect(getDialectIcon(input)).toContain(`/sqlite.png`);
    });

    test("mariadb", async () => {
      const input = `mariadb`;
      expect(getDialectIcon(input)).toContain(`/mariadb.png`);
    });

    test("mysql", async () => {
      const input = `mysql`;
      expect(getDialectIcon(input)).toContain(`/mysql.png`);
    });

    test("redis", async () => {
      const input = `redis`;
      expect(getDialectIcon(input)).toContain(`/redis.png`);
    });

    test("rediss", async () => {
      const input = `rediss`;
      expect(getDialectIcon(input)).toContain(`/redis.png`);
    });

    test("sfdc", async () => {
      const input = `sfdc`;
      expect(getDialectIcon(input)).toContain(`/salesforce.png`);
    });
  });

  describe("SUPPORTED_DIALECTS", () => {
    test("should include all major dialects", () => {
      expect(SUPPORTED_DIALECTS).toContain("mysql");
      expect(SUPPORTED_DIALECTS).toContain("postgres");
      expect(SUPPORTED_DIALECTS).toContain("mssql");
      expect(SUPPORTED_DIALECTS).toContain("sqlite");
      expect(SUPPORTED_DIALECTS).toContain("cassandra");
      expect(SUPPORTED_DIALECTS).toContain("mongodb");
      expect(SUPPORTED_DIALECTS).toContain("redis");
      expect(SUPPORTED_DIALECTS).toContain("cosmosdb");
      expect(SUPPORTED_DIALECTS).toContain("aztable");
      expect(SUPPORTED_DIALECTS).toContain("sfdc");
    });
  });

  describe("getDialectTypeFromConnectionString", () => {
    test("should extract dialect from url", () => {
      expect(getDialectTypeFromConnectionString("mysql://localhost:3306")).toEqual("mysql");
      expect(getDialectTypeFromConnectionString("postgres://localhost")).toEqual("postgres");
      expect(getDialectTypeFromConnectionString("mongodb+srv://host")).toEqual("mongodb+srv");
    });

    test("should return empty string for non-url string", () => {
      expect(getDialectTypeFromConnectionString("not-a-url")).toEqual("");
    });
  });

  describe("getConnectionFormInputs", () => {
    test("should return array for known dialect", () => {
      const inputs = getConnectionFormInputs("sfdc");
      expect(Array.isArray(inputs)).toBe(true);
    });

    test("should return empty array for unknown dialect", () => {
      expect(getConnectionFormInputs("bogus")).toEqual([]);
    });

    test("should return empty array for undefined", () => {
      expect(getConnectionFormInputs(undefined)).toEqual([]);
    });
  });

  describe("getConnectionStringFormat", () => {
    test("should return url for relational dialects", () => {
      expect(getConnectionStringFormat("mysql")).toEqual("url");
      expect(getConnectionStringFormat("postgres")).toEqual("url");
    });

    test("should return json for sfdc", () => {
      expect(getConnectionStringFormat("sfdc")).toEqual("json");
    });

    test("should return ado for aztable", () => {
      expect(getConnectionStringFormat("aztable")).toEqual("ado");
    });

    test("should return url for unknown", () => {
      expect(getConnectionStringFormat("bogus")).toEqual("url");
    });
  });

  describe("isDialectSupportMigration", () => {
    test("should return truthy for mysql", () => {
      expect(isDialectSupportMigration("mysql")).toBeTruthy();
    });

    test("should return falsy for undefined", () => {
      expect(isDialectSupportMigration(undefined)).toBeFalsy();
    });
  });

  describe("isDialectSupportCreateRecordForm", () => {
    test("should return truthy for mysql", () => {
      expect(isDialectSupportCreateRecordForm("mysql")).toBeTruthy();
    });

    test("should return truthy for mongodb", () => {
      expect(isDialectSupportCreateRecordForm("mongodb")).toBeTruthy();
    });

    test("should return falsy for undefined", () => {
      expect(isDialectSupportCreateRecordForm(undefined)).toBeFalsy();
    });
  });

  describe("isDialectSupportEditRecordForm", () => {
    test("should return truthy for mysql", () => {
      expect(isDialectSupportEditRecordForm("mysql")).toBeTruthy();
    });

    test("should return falsy for undefined", () => {
      expect(isDialectSupportEditRecordForm(undefined)).toBeFalsy();
    });
  });

  describe("isDialectSupportVisualization", () => {
    test("should return true for relational dialects", () => {
      expect(isDialectSupportVisualization("mysql")).toBe(true);
      expect(isDialectSupportVisualization("postgres")).toBe(true);
    });

    test("should return false for non-relational dialects", () => {
      expect(isDialectSupportVisualization("mongodb")).toBe(false);
      expect(isDialectSupportVisualization("redis")).toBe(false);
    });

    test("should return false for unknown/undefined", () => {
      expect(isDialectSupportVisualization(undefined)).toBe(false);
      expect(isDialectSupportVisualization("bogus")).toBe(false);
    });
  });

  describe("getSyntaxModeByDialect", () => {
    test("should return sql for relational", () => {
      expect(getSyntaxModeByDialect("mysql")).toEqual("sql");
    });

    test("should return javascript for mongodb", () => {
      expect(getSyntaxModeByDialect("mongodb")).toEqual("javascript");
    });

    test("should return sql for unknown", () => {
      expect(getSyntaxModeByDialect("bogus")).toEqual("sql");
    });
  });

  describe("getIsTableIdRequiredForQueryByDialect", () => {
    test("should return false for mysql", () => {
      expect(getIsTableIdRequiredForQueryByDialect("mysql")).toBe(false);
    });

    test("should return true for aztable", () => {
      expect(getIsTableIdRequiredForQueryByDialect("aztable")).toBe(true);
    });

    test("should return false for unknown", () => {
      expect(getIsTableIdRequiredForQueryByDialect("bogus")).toBe(false);
    });
  });

  describe("getSampleConnectionString", () => {
    test("should return non-empty string for known dialects", () => {
      expect(getSampleConnectionString("mysql").length).toBeGreaterThan(0);
      expect(getSampleConnectionString("postgres").length).toBeGreaterThan(0);
      expect(getSampleConnectionString("cassandra").length).toBeGreaterThan(0);
      expect(getSampleConnectionString("mongodb").length).toBeGreaterThan(0);
    });

    test("should return empty string for unknown", () => {
      expect(getSampleConnectionString("bogus")).toEqual("");
    });
  });

  describe("getConnectionSetupGuide", () => {
    test("should return HTML for known dialects", () => {
      const guide = getConnectionSetupGuide("mysql");
      expect(guide.length).toBeGreaterThan(0);
    });

    test("should return empty for unknown", () => {
      expect(getConnectionSetupGuide("bogus")).toEqual("");
    });
  });

  describe("getSampleSelectQuery", () => {
    test("should return SELECT query for mysql", () => {
      const result = getSampleSelectQuery({
        dialect: "mysql",
        connectionId: "c1",
        databaseId: "db1",
        tableId: "users",
        querySize: 100,
        columns: [{ name: "id", type: "INT" }],
      } as any);
      expect(result).toContain("SELECT");
    });

    test("should return query for mongodb", () => {
      const result = getSampleSelectQuery({
        dialect: "mongodb",
        connectionId: "c1",
        databaseId: "db1",
        tableId: "users",
        querySize: 100,
        columns: [],
      } as any);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getCodeSnippet", () => {
    test("should return javascript snippet for mysql", () => {
      const result = getCodeSnippet(
        { dialect: "mysql", connection: "mysql://root:pass@localhost:3306", id: "c1", name: "Test" } as any,
        { sql: "SELECT 1", databaseId: "testdb" } as any,
        "javascript" as any,
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("mysql");
    });

    test("should return python snippet for postgres", () => {
      const result = getCodeSnippet(
        { dialect: "postgres", connection: "postgres://user:pass@localhost:5432", id: "c1", name: "Test" } as any,
        { sql: "SELECT 1", databaseId: "testdb" } as any,
        "python" as any,
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test("should return java snippet for mysql", () => {
      const result = getCodeSnippet(
        { dialect: "mysql", connection: "mysql://root:pass@localhost:3306", id: "c1", name: "Test" } as any,
        { sql: "SELECT 1", databaseId: "testdb" } as any,
        "java" as any,
      );
      expect(result.length).toBeGreaterThan(0);
    });

    test("should handle empty sql", () => {
      const result = getCodeSnippet(
        { dialect: "mysql", connection: "mysql://root:pass@localhost:3306", id: "c1", name: "Test" } as any,
        { databaseId: "testdb" } as any,
        "javascript" as any,
      );
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
