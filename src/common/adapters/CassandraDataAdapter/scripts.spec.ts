import { describe, expect, test, vi } from "vitest";

vi.mock("src/common/adapters/CassandraDataAdapter/cassandra.png", () => ({ default: "mock-icon" }));
vi.mock("src/common/adapters/CassandraDataAdapter/utils", () => ({
  getClientOptions: vi.fn(),
}));

import {
  ConcreteDataScripts,
  getAddColumn,
  getBulkInsert,
  getCreateKeyspace,
  getCreateTable,
  getDelete,
  getDropColumns,
  getDropKeyspace,
  getDropTable,
  getInsert,
  getSelectAllColumns,
  getSelectSpecificColumns,
  getUpdate,
  getUpdateWithValues,
} from "src/common/adapters/CassandraDataAdapter/scripts";

const baseInput = {
  dialect: "cassandra",
  connectionId: "conn1",
  databaseId: "test_keyspace",
  tableId: "users",
  querySize: 200,
  columns: [
    { name: "id", type: "uuid", kind: "partition_key", primaryKey: true },
    { name: "name", type: "text", kind: "regular" },
    { name: "age", type: "int", kind: "regular" },
  ],
} as any;

const noColumnsInput = { ...baseInput, columns: undefined } as any;

describe("CassandraDataAdapter scripts", () => {
  describe("getSelectAllColumns", () => {
    test("returns object with label and query", () => {
      const result = getSelectAllColumns(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Select All Columns");
      expect(result!.query).toBeDefined();
    });

    test("query contains SELECT * FROM and LIMIT", () => {
      const result = getSelectAllColumns(baseInput);
      expect(result!.query).toContain("SELECT *");
      expect(result!.query).toContain("FROM users");
      expect(result!.query).toContain("LIMIT 200");
    });
  });

  describe("getSelectSpecificColumns", () => {
    test("returns object with label and query", () => {
      const result = getSelectSpecificColumns(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Select Specific Columns");
      expect(result!.query).toBeDefined();
    });

    test("query contains specific column names", () => {
      const result = getSelectSpecificColumns(baseInput);
      expect(result!.query).toContain("SELECT");
      expect(result!.query).toContain("id");
      expect(result!.query).toContain("name");
      expect(result!.query).toContain("age");
      expect(result!.query).toContain("FROM users");
      expect(result!.query).toContain("WHERE");
      expect(result!.query).toContain("LIMIT 200");
    });

    test("returns undefined when columns are missing", () => {
      const result = getSelectSpecificColumns(noColumnsInput);
      expect(result).toBeUndefined();
    });
  });

  describe("getInsert", () => {
    test("returns object with label and query", () => {
      const result = getInsert(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Insert");
      expect(result!.query).toBeDefined();
    });

    test("query contains INSERT INTO with column names and dummy values", () => {
      const result = getInsert(baseInput);
      expect(result!.query).toContain("INSERT INTO users");
      expect(result!.query).toContain("id");
      expect(result!.query).toContain("name");
      expect(result!.query).toContain("age");
      expect(result!.query).toContain("VALUES");
    });

    test("generates dummy values matching column types", () => {
      const result = getInsert(baseInput);
      expect(result!.query).toContain("'_id_'");
      expect(result!.query).toContain("'_name_'");
      expect(result!.query).toContain("123");
    });

    test("uses provided values when given", () => {
      const result = getInsert(baseInput, { id: "abc-123", name: "Alice", age: 30 });
      expect(result!.query).toContain("'abc-123'");
      expect(result!.query).toContain("'Alice'");
      expect(result!.query).toContain("30");
    });

    test("handles null values", () => {
      const result = getInsert(baseInput, { id: null, name: "Alice", age: 30 });
      expect(result!.query).toContain("null");
    });

    test("returns undefined when columns are missing", () => {
      const result = getInsert(noColumnsInput);
      expect(result).toBeUndefined();
    });
  });

  describe("getBulkInsert", () => {
    test("returns object with label and query containing BATCH", () => {
      const rows = [
        { id: "a", name: "Alice", age: 25 },
        { id: "b", name: "Bob", age: 30 },
      ];
      const result = getBulkInsert(baseInput, rows);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Insert");
      expect(result!.query).toContain("BEGIN BATCH");
      expect(result!.query).toContain("APPLY BATCH");
    });

    test("query contains multiple INSERT statements", () => {
      const rows = [
        { id: "a", name: "Alice", age: 25 },
        { id: "b", name: "Bob", age: 30 },
      ];
      const result = getBulkInsert(baseInput, rows);
      expect(result!.query).toContain("'Alice'");
      expect(result!.query).toContain("'Bob'");
    });

    test("returns undefined when columns are missing", () => {
      const result = getBulkInsert(noColumnsInput, [{ id: "a" }]);
      expect(result).toBeUndefined();
    });

    test("returns undefined when rows are empty", () => {
      const result = getBulkInsert(baseInput, []);
      expect(result).toBeUndefined();
    });

    test("returns undefined when rows are undefined", () => {
      const result = getBulkInsert(baseInput, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("getUpdateWithValues", () => {
    test("returns object with label and query", () => {
      const result = getUpdateWithValues(baseInput, { name: "Alice" }, { id: "abc" });
      expect(result).toBeDefined();
      expect(result!.label).toBe("Update");
      expect(result!.query).toBeDefined();
    });

    test("query contains UPDATE, SET, and WHERE clauses", () => {
      const result = getUpdateWithValues(baseInput, { name: "Alice", age: 30 }, { id: "abc" });
      expect(result!.query).toContain("UPDATE users");
      expect(result!.query).toContain("SET");
      expect(result!.query).toContain("name = 'Alice'");
      expect(result!.query).toContain("age = 30");
      expect(result!.query).toContain("WHERE");
      expect(result!.query).toContain("id = 'abc'");
    });

    test("returns undefined when columns are missing", () => {
      const result = getUpdateWithValues(noColumnsInput, { name: "Alice" }, { id: "abc" });
      expect(result).toBeUndefined();
    });
  });

  describe("getUpdate", () => {
    test("returns object with label and query", () => {
      const result = getUpdate(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Update");
      expect(result!.query).toBeDefined();
    });

    test("query contains UPDATE template with SET and WHERE", () => {
      const result = getUpdate(baseInput);
      expect(result!.query).toContain("UPDATE users");
      expect(result!.query).toContain("SET");
      expect(result!.query).toContain("WHERE");
      expect(result!.query).toContain("id =");
      expect(result!.query).toContain("name =");
      expect(result!.query).toContain("age =");
    });

    test("returns undefined when columns are missing", () => {
      const result = getUpdate(noColumnsInput);
      expect(result).toBeUndefined();
    });
  });

  describe("getDelete", () => {
    test("returns object with label and query", () => {
      const result = getDelete(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Delete");
      expect(result!.query).toBeDefined();
    });

    test("query contains DELETE FROM with WHERE clause", () => {
      const result = getDelete(baseInput);
      expect(result!.query).toContain("DELETE FROM users");
      expect(result!.query).toContain("WHERE");
      expect(result!.query).toContain("id = ''");
      expect(result!.query).toContain("name = ''");
      expect(result!.query).toContain("age = ''");
    });

    test("returns undefined when columns are missing", () => {
      const result = getDelete(noColumnsInput);
      expect(result).toBeUndefined();
    });
  });

  describe("getCreateKeyspace", () => {
    test("returns object with label and query", () => {
      const input = { databaseId: "test_keyspace" } as any;
      const result = getCreateKeyspace(input);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Create Keyspace");
      expect(result!.query).toBeDefined();
    });

    test("query contains CREATE KEYSPACE with replication", () => {
      const input = { databaseId: "test_keyspace" } as any;
      const result = getCreateKeyspace(input);
      expect(result!.query).toContain("CREATE KEYSPACE IF NOT EXISTS test_keyspace");
      expect(result!.query).toContain("SimpleStrategy");
      expect(result!.query).toContain("replication_factor");
    });

    test("uses fallback name when databaseId is missing", () => {
      const input = {} as any;
      const result = getCreateKeyspace(input);
      expect(result!.query).toContain("some_keyspace");
    });
  });

  describe("getDropKeyspace", () => {
    test("returns object with label and query", () => {
      const input = { databaseId: "test_keyspace" } as any;
      const result = getDropKeyspace(input);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Drop Keyspace");
      expect(result!.query).toBeDefined();
    });

    test("query contains DROP KEYSPACE", () => {
      const input = { databaseId: "test_keyspace" } as any;
      const result = getDropKeyspace(input);
      expect(result!.query).toContain("DROP KEYSPACE IF EXISTS test_keyspace");
    });
  });

  describe("getCreateTable", () => {
    test("returns object with label and query", () => {
      const result = getCreateTable(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Create Table");
      expect(result!.query).toBeDefined();
    });

    test("query contains CREATE TABLE with columns and primary key", () => {
      const result = getCreateTable(baseInput);
      expect(result!.query).toContain("CREATE TABLE users");
      expect(result!.query).toContain("id uuid PRIMARY KEY");
      expect(result!.query).toContain("name text");
      expect(result!.query).toContain("age int");
      expect(result!.query).toContain("PRIMARY KEY((id))");
    });

    test("handles partition and clustering keys", () => {
      const input = {
        ...baseInput,
        columns: [
          { name: "id", type: "uuid", kind: "partition_key", primaryKey: true },
          { name: "created_at", type: "timestamp", kind: "clustering" },
          { name: "name", type: "text", kind: "regular" },
        ],
      } as any;
      const result = getCreateTable(input);
      expect(result!.query).toContain("PRIMARY KEY((id), created_at)");
    });

    test("returns undefined when columns are missing", () => {
      const result = getCreateTable(noColumnsInput);
      expect(result).toBeUndefined();
    });
  });

  describe("getDropTable", () => {
    test("returns object with label and query", () => {
      const result = getDropTable(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Drop Table");
      expect(result!.query).toBeDefined();
    });

    test("query contains DROP TABLE", () => {
      const result = getDropTable(baseInput);
      expect(result!.query).toContain("DROP TABLE users");
    });
  });

  describe("getAddColumn", () => {
    test("returns object with label and query", () => {
      const result = getAddColumn(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Add Column");
      expect(result!.query).toBeDefined();
    });

    test("query contains ALTER TABLE ADD", () => {
      const result = getAddColumn(baseInput);
      expect(result!.query).toContain("ALTER TABLE users");
      expect(result!.query).toContain("ADD new_column1 TEXT");
    });
  });

  describe("getDropColumns", () => {
    test("returns object with label and query", () => {
      const result = getDropColumns(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Drop Column");
      expect(result!.query).toBeDefined();
    });

    test("query contains ALTER TABLE DROP for each column", () => {
      const result = getDropColumns(baseInput);
      expect(result!.query).toContain("ALTER TABLE users");
      expect(result!.query).toContain("DROP id");
      expect(result!.query).toContain("DROP name");
      expect(result!.query).toContain("DROP age");
    });
  });

  describe("ConcreteDataScripts", () => {
    const scripts = new ConcreteDataScripts();

    test("isDialectSupported returns true for cassandra", () => {
      expect(scripts.isDialectSupported("cassandra")).toBe(true);
    });

    test("isDialectSupported returns false for mysql", () => {
      expect(scripts.isDialectSupported("mysql")).toBe(false);
    });

    test("getIsTableIdRequiredForQuery returns false", () => {
      expect(scripts.getIsTableIdRequiredForQuery()).toBe(false);
    });

    test("getSyntaxMode returns sql", () => {
      expect(scripts.getSyntaxMode()).toBe("sql");
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

    test("getSampleConnectionString returns a cassandra URL", () => {
      const sample = scripts.getSampleConnectionString();
      expect(sample).toContain("cassandra://");
    });

    test("getSampleSelectQuery delegates to getSelectAllColumns", () => {
      const result = scripts.getSampleSelectQuery(baseInput);
      expect(result).toBeDefined();
      expect(result!.query).toContain("SELECT *");
      expect(result!.query).toContain("FROM users");
    });

    test("getTableScripts returns an array of functions", () => {
      const tableScripts = scripts.getTableScripts();
      expect(Array.isArray(tableScripts)).toBe(true);
      expect(tableScripts.length).toBeGreaterThan(0);
    });

    test("getDatabaseScripts returns an array of functions", () => {
      const dbScripts = scripts.getDatabaseScripts();
      expect(Array.isArray(dbScripts)).toBe(true);
      expect(dbScripts.length).toBeGreaterThan(0);
    });

    test("getConnectionScripts returns an array of functions", () => {
      const connScripts = scripts.getConnectionScripts();
      expect(Array.isArray(connScripts)).toBe(true);
      expect(connScripts.length).toBeGreaterThan(0);
    });
  });
});
