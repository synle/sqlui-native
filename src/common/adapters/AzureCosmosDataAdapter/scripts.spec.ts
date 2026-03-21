import { describe, expect, test } from "vitest";
import {
  ConcreteDataScripts,
  COSMOSDB_ADAPTER_PREFIX,
  getBulkInsert,
  getCreateConnectionDatabase,
  getCreateContainer,
  getCreateDatabase,
  getCreateDatabaseContainer,
  getDelete,
  getDropContainer,
  getDropDatabase,
  getInsert,
  getRawSelectAllColumns,
  getReadItemById,
  getSelectAllColumns,
  getSelectById,
  getSelectSpecificColumns,
  getUpdate,
  getUpdateWithValues,
} from "src/common/adapters/AzureCosmosDataAdapter/scripts";

const tableInput = {
  dialect: "cosmosdb",
  connectionId: "conn1",
  databaseId: "testdb",
  tableId: "container1",
  querySize: 200,
  columns: [
    { name: "id", type: "String", primaryKey: true },
    { name: "name", type: "String" },
  ],
} as any;

const databaseInput = {
  dialect: "cosmosdb",
  connectionId: "conn1",
  databaseId: "testdb",
} as any;

const connectionInput = {
  dialect: "cosmosdb",
  connectionId: "conn1",
} as any;

describe("AzureCosmosDataAdapter scripts", () => {
  describe("COSMOSDB_ADAPTER_PREFIX", () => {
    test("should equal db", () => {
      expect(COSMOSDB_ADAPTER_PREFIX).toBe("db");
    });
  });

  describe("getRawSelectAllColumns", () => {
    test("returns object with label and query", () => {
      const result = getRawSelectAllColumns(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Raw Select All Columns");
      expect(result!.query).toContain("SELECT * FROM c");
    });
  });

  describe("getSelectAllColumns", () => {
    test("returns object with label and query", () => {
      const result = getSelectAllColumns(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Select All Columns");
      expect(result!.query).toContain("database('testdb')");
      expect(result!.query).toContain("container('container1')");
      expect(result!.query).toContain("SELECT");
      expect(result!.query).toContain("LIMIT 200");
    });
  });

  describe("getSelectById", () => {
    test("returns object with label and query", () => {
      const result = getSelectById(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Select By Id");
      expect(result!.query).toContain("database('testdb')");
      expect(result!.query).toContain("container('container1')");
      expect(result!.query).toContain("WHERE");
      expect(result!.query).toContain("id = '123'");
    });
  });

  describe("getReadItemById", () => {
    test("returns object with label and query", () => {
      const result = getReadItemById(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Read");
      expect(result!.query).toContain("database('testdb')");
      expect(result!.query).toContain("container('container1')");
      expect(result!.query).toContain(".item(");
      expect(result!.query).toContain(".read()");
    });
  });

  describe("getSelectSpecificColumns", () => {
    test("returns object with label and query containing column names", () => {
      const result = getSelectSpecificColumns(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Select Specific Columns");
      expect(result!.query).toContain("c.id");
      expect(result!.query).toContain("c.name");
      expect(result!.query).toContain("LIMIT 200");
    });
  });

  describe("getInsert", () => {
    test("returns object with label and query", () => {
      const result = getInsert(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Insert");
      expect(result!.query).toContain("database('testdb')");
      expect(result!.query).toContain("container('container1')");
      expect(result!.query).toContain(".create(");
    });

    test("uses provided value when given", () => {
      const result = getInsert(tableInput, { id: "abc", name: "test" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("abc");
      expect(result!.query).toContain("test");
    });
  });

  describe("getBulkInsert", () => {
    test("returns undefined when no rows provided", () => {
      const result = getBulkInsert(tableInput);
      expect(result).toBeUndefined();
    });

    test("returns undefined when rows array is empty", () => {
      const result = getBulkInsert(tableInput, []);
      expect(result).toBeUndefined();
    });

    test("returns object with label and query when rows provided", () => {
      const rows = [
        { id: "1", name: "row1" },
        { id: "2", name: "row2" },
      ];
      const result = getBulkInsert(tableInput, rows);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Insert");
      expect(result!.query).toContain("Promise.all");
      expect(result!.query).toContain("containerItems.create(");
      expect(result!.query).toContain("row1");
      expect(result!.query).toContain("row2");
    });
  });

  describe("getUpdate", () => {
    test("returns object with label and query", () => {
      const result = getUpdate(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Update");
      expect(result!.query).toContain("database('testdb')");
      expect(result!.query).toContain("container('container1')");
      expect(result!.query).toContain(".replace(");
      expect(result!.query).toContain("some_id");
    });
  });

  describe("getUpdateWithValues", () => {
    test("returns object with label and query", () => {
      const result = getUpdateWithValues(tableInput, { name: "updated" }, { id: "123" });
      expect(result).toBeDefined();
      expect(result!.label).toContain("Update");
      expect(result!.query).toContain(".replace(");
      expect(result!.query).toContain("updated");
    });
  });

  describe("getDelete", () => {
    test("returns object with label and query", () => {
      const result = getDelete(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Delete");
      expect(result!.query).toContain("database('testdb')");
      expect(result!.query).toContain("container('container1')");
      expect(result!.query).toContain(".delete()");
    });
  });

  describe("getCreateContainer", () => {
    test("returns object with label and query", () => {
      const result = getCreateContainer(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Create Container");
      expect(result!.query).toContain("database('testdb')");
      expect(result!.query).toContain(".containers");
      expect(result!.query).toContain(".create(");
      expect(result!.query).toContain("container1");
    });
  });

  describe("getDropContainer", () => {
    test("returns object with label and query", () => {
      const result = getDropContainer(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Drop Container");
      expect(result!.query).toContain("container('container1')");
      expect(result!.query).toContain(".delete()");
    });
  });

  describe("getCreateDatabase", () => {
    test("returns object with label and query", () => {
      const result = getCreateDatabase(databaseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Create Database");
      expect(result!.query).toContain(".databases");
      expect(result!.query).toContain("testdb");
    });
  });

  describe("getCreateDatabaseContainer", () => {
    test("returns object with label and query", () => {
      const result = getCreateDatabaseContainer(databaseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Create Database Container");
      expect(result!.query).toContain("database('testdb')");
      expect(result!.query).toContain(".containers");
      expect(result!.query).toContain("some_container_name");
    });
  });

  describe("getDropDatabase", () => {
    test("returns object with label and query", () => {
      const result = getDropDatabase(databaseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Drop Database");
      expect(result!.query).toContain("database('testdb')");
      expect(result!.query).toContain(".delete()");
    });
  });

  describe("getCreateConnectionDatabase", () => {
    test("returns object with label and query", () => {
      const result = getCreateConnectionDatabase(connectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Create Database");
      expect(result!.query).toContain(".databases");
      expect(result!.query).toContain("some_database_name");
    });
  });

  describe("ConcreteDataScripts", () => {
    const scripts = new ConcreteDataScripts();

    test("isDialectSupported returns true for cosmosdb", () => {
      expect(scripts.isDialectSupported("cosmosdb" as any)).toBe(true);
    });

    test("isDialectSupported returns false for mysql", () => {
      expect(scripts.isDialectSupported("mysql" as any)).toBe(false);
    });

    test("getIsTableIdRequiredForQuery returns true", () => {
      expect(scripts.getIsTableIdRequiredForQuery()).toBe(true);
    });

    test("getSyntaxMode returns javascript", () => {
      expect(scripts.getSyntaxMode()).toBe("javascript");
    });

    test("supportMigration returns true", () => {
      expect(scripts.supportMigration()).toBe(true);
    });

    test("supportCreateRecordForm returns true", () => {
      expect(scripts.supportCreateRecordForm()).toBe(true);
    });

    test("supportEditRecordForm returns true", () => {
      expect(scripts.supportEditRecordForm()).toBe(true);
    });

    test("getConnectionStringFormat returns ado", () => {
      expect(scripts.getConnectionStringFormat()).toBe("ado");
    });

    test("getDialectName returns Azure Cosmos DB", () => {
      expect(scripts.getDialectName()).toBe("Azure Cosmos DB");
    });

    test("getTableScripts returns array of functions", () => {
      const tableScripts = scripts.getTableScripts();
      expect(tableScripts.length).toBeGreaterThan(0);
    });

    test("getDatabaseScripts returns array of functions", () => {
      const dbScripts = scripts.getDatabaseScripts();
      expect(dbScripts.length).toBeGreaterThan(0);
    });

    test("getConnectionScripts returns array of functions", () => {
      const connScripts = scripts.getConnectionScripts();
      expect(connScripts.length).toBeGreaterThan(0);
    });

    test("getSampleConnectionString contains cosmosdb prefix", () => {
      const sample = scripts.getSampleConnectionString("cosmosdb");
      expect(sample).toContain("cosmosdb://");
      expect(sample).toContain("AccountEndpoint");
      expect(sample).toContain("AccountKey");
    });

    test("getSampleSelectQuery returns a select query", () => {
      const result = scripts.getSampleSelectQuery(tableInput);
      expect(result).toBeDefined();
      expect(result!.query).toContain("SELECT");
    });
  });
});
