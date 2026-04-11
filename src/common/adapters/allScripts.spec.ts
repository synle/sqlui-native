import {
  getCodeSnippet,
  getConnectionActions,
  getConnectionSetupGuide,
  getDatabaseActions,
  getSampleSelectQuery,
  getTableActions,
} from "src/common/adapters/DataScriptFactory";
import * as cassScripts from "src/common/adapters/CassandraDataAdapter/scripts";
import * as mongoScripts from "src/common/adapters/MongoDBDataAdapter/scripts";
import * as cosmosScripts from "src/common/adapters/AzureCosmosDataAdapter/scripts";
import * as aztableScripts from "src/common/adapters/AzureTableStorageAdapter/scripts";
import * as sfdcScripts from "src/common/adapters/SalesforceDataAdapter/scripts";

const relBaseInput = {
  dialect: "mysql" as any,
  connectionId: "c1",
  databaseId: "testdb",
  tableId: "users",
  querySize: 200,
  columns: [
    { name: "id", type: "INT", primaryKey: true },
    { name: "name", type: "VARCHAR(100)" },
    { name: "email", type: "VARCHAR(255)" },
  ],
};

const cassInput = {
  ...relBaseInput,
  dialect: "cassandra" as any,
  columns: [
    { name: "id", type: "uuid", kind: "partition_key" as const, primaryKey: true },
    { name: "name", type: "text", kind: "regular" as const },
  ],
};
const mongoInput = {
  ...relBaseInput,
  dialect: "mongodb" as any,
  columns: [
    { name: "_id", type: "ObjectId", primaryKey: true },
    { name: "name", type: "String" },
  ],
};
const cosmosInput = {
  ...relBaseInput,
  dialect: "cosmosdb" as any,
  tableId: "container1",
  columns: [
    { name: "id", type: "String", primaryKey: true },
    { name: "name", type: "String" },
  ],
};
const aztableInput = {
  ...relBaseInput,
  dialect: "aztable" as any,
  columns: [
    { name: "partitionKey", type: "String" },
    { name: "rowKey", type: "String" },
    { name: "name", type: "String" },
  ],
};
const sfdcInput = {
  ...relBaseInput,
  dialect: "sfdc" as any,
  tableId: "Account",
  columns: [
    { name: "Id", type: "id", primaryKey: true },
    { name: "Name", type: "string" },
  ],
};

const allTableInputs = [
  relBaseInput,
  { ...relBaseInput, dialect: "mssql" as any },
  { ...relBaseInput, dialect: "postgres" as any },
  { ...relBaseInput, dialect: "sqlite" as any },
  { ...relBaseInput, dialect: "mariadb" as any },
  cassInput,
  mongoInput,
  cosmosInput,
  aztableInput,
  sfdcInput,
];

describe("All adapters - table actions", () => {
  for (const input of allTableInputs) {
    test(`getTableActions for ${input.dialect} returns actions`, () => {
      const actions = getTableActions(input);
      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) {
        expect(action.label).toBeDefined();
      }
    });
  }
});

describe("All adapters - database actions", () => {
  for (const input of allTableInputs) {
    test(`getDatabaseActions for ${input.dialect}`, () => {
      const actions = getDatabaseActions({
        dialect: input.dialect,
        connectionId: input.connectionId,
        databaseId: input.databaseId,
        querySize: input.querySize,
      });
      expect(Array.isArray(actions)).toBe(true);
    });
  }
});

describe("All adapters - connection actions", () => {
  for (const input of allTableInputs) {
    test(`getConnectionActions for ${input.dialect}`, () => {
      const actions = getConnectionActions({ dialect: input.dialect, connectionId: input.connectionId });
      expect(Array.isArray(actions)).toBe(true);
    });
  }
});

describe("All adapters - sample select query", () => {
  for (const input of allTableInputs) {
    test(`getSampleSelectQuery for ${input.dialect}`, () => {
      const query = getSampleSelectQuery(input);
      expect(typeof query).toBe("string");
    });
  }
});

describe("All adapters - connection setup guide", () => {
  for (const input of allTableInputs) {
    test(`getConnectionSetupGuide for ${input.dialect}`, () => {
      const guide = getConnectionSetupGuide(input.dialect);
      expect(typeof guide).toBe("string");
    });
  }
});

describe("Cassandra scripts - direct function calls", () => {
  test("getInsert with values", () => {
    const r = cassScripts.getInsert(cassInput, { id: "uuid-1", name: "Globex Corp" });
    expect(r?.query).toContain("Globex Corp");
  });
  test("getBulkInsert with rows", () => {
    const r = cassScripts.getBulkInsert(cassInput, [
      { id: "u1", name: "Acme" },
      { id: "u2", name: "Initech" },
    ]);
    expect(r?.query).toContain("Acme");
  });
  test("getUpdateWithValues", () => {
    const r = cassScripts.getUpdateWithValues(cassInput, { name: "Updated" }, { id: "uuid-1" });
    expect(r?.query).toContain("Updated");
  });
});

describe("MongoDB scripts - direct function calls", () => {
  test("getInsert with values", () => {
    const r = mongoScripts.getInsert(mongoInput, { name: "Globex Corp" });
    expect(r?.query).toContain("Globex Corp");
  });
  test("getBulkInsert with rows", () => {
    const r = mongoScripts.getBulkInsert(mongoInput, [{ name: "Acme" }, { name: "Initech" }]);
    expect(r?.query).toContain("Acme");
  });
  test("getUpdateWithValues", () => {
    const r = mongoScripts.getUpdateWithValues(mongoInput, { name: "Updated" }, {});
    expect(r?.query).toContain("Updated");
  });
  test("getSelectOne", () => {
    const r = mongoScripts.getSelectOne(mongoInput);
    expect(r?.query).toContain("findOne");
  });
  test("getSelectDistinctValues", () => {
    const r = mongoScripts.getSelectDistinctValues(mongoInput);
    expect(r?.query).toContain("distinct");
  });
  test("getCreateCollection", () => {
    expect(mongoScripts.getCreateCollection(mongoInput)?.query).toContain("createCollection");
  });
  test("getDropCollection", () => {
    expect(mongoScripts.getDropCollection(mongoInput)?.query).toContain("drop");
  });
  test("serializeJsonForMongoScript", () => {
    expect(mongoScripts.serializeJsonForMongoScript({ a: 1 })).toContain("a");
    expect(mongoScripts.serializeJsonForMongoScript("hello")).toContain("hello");
    expect(mongoScripts.serializeJsonForMongoScript(null)).toBe("null");
    expect(mongoScripts.serializeJsonForMongoScript(42)).toBe("42");
    expect(mongoScripts.serializeJsonForMongoScript(true)).toBe("true");
    expect(mongoScripts.serializeJsonForMongoScript([1, 2])).toContain("[");
  });
});

describe("CosmosDB scripts - direct function calls", () => {
  test("getInsert with values", () => {
    const r = cosmosScripts.getInsert(cosmosInput, { id: "1", name: "Globex" });
    expect(r?.query).toContain("Globex");
  });
  test("getUpdateWithValues", () => {
    const r = cosmosScripts.getUpdateWithValues(cosmosInput, { name: "Updated" }, {});
    expect(r?.query).toContain("Updated");
  });
});

describe("Azure Table Storage scripts - direct function calls", () => {
  test("getInsert with values", () => {
    const r = aztableScripts.getInsert(aztableInput, { partitionKey: "pk", rowKey: "rk", name: "Acme" });
    expect(r?.query).toContain("Acme");
  });
  test("getUpdateWithValues", () => {
    const r = aztableScripts.getUpdateWithValues(aztableInput, { name: "Updated" }, {});
    expect(r?.query).toContain("Updated");
  });
});

describe("Salesforce scripts - direct function calls", () => {
  test("getInsert with values", () => {
    const r = sfdcScripts.getInsert(sfdcInput, { Name: "Acme Corp" });
    expect(r?.query).toContain("Acme Corp");
  });
  test("getUpdateWithValues", () => {
    const r = sfdcScripts.getUpdateWithValues(sfdcInput, { Name: "Updated" }, { Id: "001abc" });
    expect(r?.query).toContain("Updated");
  });
});

describe("Code snippets through DataScriptFactory", () => {
  const snippetDialects = [
    { dialect: "mysql" as any, connection: "mysql://root:pass@localhost:3306" },
    { dialect: "postgres" as any, connection: "postgres://user:pass@localhost:5432" },
    { dialect: "cassandra" as any, connection: "cassandra://user:pass@localhost:9042" },
    { dialect: "mongodb" as any, connection: "mongodb://localhost:27017" },
    { dialect: "redis" as any, connection: "redis://localhost:6379" },
    { dialect: "cosmosdb" as any, connection: "cosmosdb://AccountEndpoint=https://host:443;AccountKey=key" },
    {
      dialect: "aztable" as any,
      connection: "aztable://DefaultEndpointsProtocol=https;AccountName=acct;AccountKey=key;EndpointSuffix=core.windows.net",
    },
    {
      dialect: "sfdc" as any,
      connection: 'sfdc://{"username":"u","password":"p","securityToken":"t","loginUrl":"https://login.salesforce.com"}',
    },
    {
      dialect: "rest" as any,
      connection: 'rest://{"HOST":"https://httpbin.org"}',
    },
  ];

  const languages = ["javascript" as any, "python" as any, "java" as any];

  for (const { dialect, connection } of snippetDialects) {
    for (const language of languages) {
      test(`${dialect} / ${language}`, () => {
        const snippet = getCodeSnippet(
          { dialect, connection, id: "c1", name: "Test" } as any,
          { sql: "SELECT 1", databaseId: "db1", tableId: "t1" } as any,
          language,
        );
        expect(typeof snippet).toBe("string");
      });
    }
  }

  describe("REST API code snippets generate real code from curl", () => {
    const restConnection = { dialect: "rest" as any, connection: 'rest://{"HOST":"https://httpbin.org"}', id: "c1", name: "Test" };
    const curlQuery = {
      sql: "curl -X POST 'https://httpbin.org/post' -H 'Content-Type: application/json' -d '{\"key\":\"value\"}'",
      databaseId: "db1",
      tableId: "t1",
    };

    test("javascript snippet contains fetch and URL", () => {
      const snippet = getCodeSnippet(restConnection as any, curlQuery as any, "javascript" as any);
      expect(snippet).toContain("fetch");
      expect(snippet).toContain("https://httpbin.org/post");
      expect(snippet).toContain("POST");
    });

    test("python snippet contains requests and URL", () => {
      const snippet = getCodeSnippet(restConnection as any, curlQuery as any, "python" as any);
      expect(snippet).toContain("requests");
      expect(snippet).toContain("https://httpbin.org/post");
      expect(snippet).toContain("post");
    });

    test("java snippet contains HttpClient and URL", () => {
      const snippet = getCodeSnippet(restConnection as any, curlQuery as any, "java" as any);
      expect(snippet).toContain("HttpClient");
      expect(snippet).toContain("https://httpbin.org/post");
      expect(snippet).toContain("POST");
    });
  });
});
