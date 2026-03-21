import { describe, expect, test } from "vitest";
import {
  AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE,
  AZTABLE_TABLE_CLIENT_PREFIX,
  AZTABLE_TABLE_SERVICE_PREFIX,
  ConcreteDataScripts,
  getBulkInsert,
  getCreateDatabaseTable,
  getCreateTable,
  getDelete,
  getDropTable,
  getInsert,
  getSelectAllColumns,
  getSelectSpecificColumns,
  getUpdate,
  getUpdateWithValues,
  getUpsert,
} from "src/common/adapters/AzureTableStorageAdapter/scripts";

const tableInput = {
  dialect: "aztable",
  connectionId: "conn1",
  databaseId: "default",
  tableId: "TestTable",
  querySize: 200,
  columns: [
    { name: "partitionKey", type: "String" },
    { name: "rowKey", type: "String" },
    { name: "name", type: "String" },
  ],
} as any;

const databaseInput = {
  dialect: "aztable",
  connectionId: "conn1",
  databaseId: "default",
} as any;

describe("AzureTableStorageAdapter scripts", () => {
  describe("exported constants", () => {
    test("AZTABLE_TABLE_CLIENT_PREFIX equals tableClient", () => {
      expect(AZTABLE_TABLE_CLIENT_PREFIX).toBe("tableClient");
    });

    test("AZTABLE_TABLE_SERVICE_PREFIX equals serviceClient", () => {
      expect(AZTABLE_TABLE_SERVICE_PREFIX).toBe("serviceClient");
    });

    test("AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE contains etag and timestamp", () => {
      expect(AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE).toContain("etag");
      expect(AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE).toContain("timestamp");
    });
  });

  describe("getSelectAllColumns", () => {
    test("returns object with label and query", () => {
      const result = getSelectAllColumns(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Select All Columns");
      expect(result!.query).toContain("tableClient");
      expect(result!.query).toContain("listEntities");
    });
  });

  describe("getSelectSpecificColumns", () => {
    test("returns object with label and query containing column names", () => {
      const result = getSelectSpecificColumns(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Select Specific Columns");
      expect(result!.query).toContain("tableClient");
      expect(result!.query).toContain("listEntities");
      expect(result!.query).toContain("PartitionKey");
      expect(result!.query).toContain("select");
      expect(result!.query).toContain("partitionKey");
      expect(result!.query).toContain("rowKey");
      expect(result!.query).toContain("name");
    });
  });

  describe("getInsert", () => {
    test("returns object with label and query", () => {
      const result = getInsert(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Insert");
      expect(result!.query).toContain("tableClient");
      expect(result!.query).toContain("createEntity");
      expect(result!.query).toContain("some_row_key");
      expect(result!.query).toContain("some_partition_key");
    });

    test("uses provided value when given", () => {
      const result = getInsert(tableInput, { partitionKey: "pk1", rowKey: "rk1", name: "test" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("pk1");
      expect(result!.query).toContain("rk1");
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

    test("returns undefined when columns is missing", () => {
      const inputNoColumns = { ...tableInput, columns: undefined } as any;
      const result = getBulkInsert(inputNoColumns, [{ name: "test" }]);
      expect(result).toBeUndefined();
    });

    test("returns object with label and query when rows provided", () => {
      const rows = [
        { partitionKey: "pk1", rowKey: "rk1", name: "row1" },
        { partitionKey: "pk2", rowKey: "rk2", name: "row2" },
      ];
      const result = getBulkInsert(tableInput, rows);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Insert");
      expect(result!.query).toContain("Promise.all");
      expect(result!.query).toContain("tableClient");
      expect(result!.query).toContain("createEntity");
      expect(result!.query).toContain("row1");
      expect(result!.query).toContain("row2");
    });
  });

  describe("getUpdate", () => {
    test("returns object with label and query", () => {
      const result = getUpdate(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Update");
      expect(result!.query).toContain("tableClient");
      expect(result!.query).toContain("updateEntity");
      expect(result!.query).toContain("some_row_key");
      expect(result!.query).toContain("some_partition_key");
    });
  });

  describe("getUpdateWithValues", () => {
    test("returns object with label and query", () => {
      const result = getUpdateWithValues(tableInput, { name: "updated" }, {});
      expect(result).toBeDefined();
      expect(result!.label).toContain("Update");
      expect(result!.query).toContain("tableClient");
      expect(result!.query).toContain("updateEntity");
      expect(result!.query).toContain("updated");
    });

    test("removes etag and timestamp from update values", () => {
      const result = getUpdateWithValues(tableInput, { name: "updated", etag: "abc", timestamp: "123" }, {});
      expect(result).toBeDefined();
      expect(result!.query).not.toContain('"etag"');
      expect(result!.query).not.toContain('"timestamp"');
    });
  });

  describe("getUpsert", () => {
    test("returns object with label and query", () => {
      const result = getUpsert(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Upsert");
      expect(result!.query).toContain("tableClient");
      expect(result!.query).toContain("upsertEntity");
      expect(result!.query).toContain("Replace");
    });
  });

  describe("getDelete", () => {
    test("returns object with label and query", () => {
      const result = getDelete(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Delete");
      expect(result!.query).toContain("tableClient");
      expect(result!.query).toContain("deleteEntity");
    });
  });

  describe("getDropTable", () => {
    test("returns object with label and query", () => {
      const result = getDropTable(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Drop Table");
      expect(result!.query).toContain("serviceClient");
      expect(result!.query).toContain("deleteTable");
      expect(result!.query).toContain("TestTable");
    });
  });

  describe("getCreateTable", () => {
    test("returns object with label and query", () => {
      const result = getCreateTable(tableInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Create Table");
      expect(result!.query).toContain("serviceClient");
      expect(result!.query).toContain("createTable");
      expect(result!.query).toContain("TestTable");
    });
  });

  describe("getCreateDatabaseTable", () => {
    test("returns object with label and query", () => {
      const result = getCreateDatabaseTable(databaseInput);
      expect(result).toBeDefined();
      expect(result!.label).toContain("Create Table");
      expect(result!.query).toContain("serviceClient");
      expect(result!.query).toContain("createTable");
      expect(result!.query).toContain("somenewtablename");
    });
  });

  describe("ConcreteDataScripts", () => {
    const scripts = new ConcreteDataScripts();

    test("isDialectSupported returns true for aztable", () => {
      expect(scripts.isDialectSupported("aztable" as any)).toBe(true);
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

    test("getDialectName returns Azure Table Storage", () => {
      expect(scripts.getDialectName()).toBe("Azure Table Storage");
    });

    test("getTableScripts returns array of functions", () => {
      const tableScripts = scripts.getTableScripts();
      expect(tableScripts.length).toBeGreaterThan(0);
    });

    test("getDatabaseScripts returns array of functions", () => {
      const dbScripts = scripts.getDatabaseScripts();
      expect(dbScripts.length).toBeGreaterThan(0);
    });

    test("getConnectionScripts returns empty array", () => {
      const connScripts = scripts.getConnectionScripts();
      expect(connScripts).toEqual([]);
    });

    test("getSampleConnectionString contains aztable prefix", () => {
      const sample = scripts.getSampleConnectionString();
      expect(sample).toContain("aztable://");
      expect(sample).toContain("AccountName");
      expect(sample).toContain("AccountKey");
    });

    test("getSampleSelectQuery returns a select query", () => {
      const result = scripts.getSampleSelectQuery(tableInput);
      expect(result).toBeDefined();
      expect(result!.query).toContain("listEntities");
    });
  });
});
