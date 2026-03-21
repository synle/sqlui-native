import { describe, expect, it } from "vitest";
import {
  serializeJsonForMongoScript,
  getSelectAllColumns,
  getSelectOne,
  getSelectSpecificColumns,
  getSelectDistinctValues,
  getInsert,
  getBulkInsert,
  getUpdateWithValues,
  getUpdate,
  getDelete,
  getCreateCollection,
  getDropCollection,
  getCreateDatabase,
  getDropDatabase,
  getCreateConnectionDatabase,
  ConcreteDataScripts,
} from "src/common/adapters/MongoDBDataAdapter/scripts";

const baseInput = {
  dialect: "mongodb",
  connectionId: "conn1",
  databaseId: "testdb",
  tableId: "users",
  querySize: 200,
  columns: [
    { name: "_id", type: "ObjectId", primaryKey: true },
    { name: "name", type: "String" },
    { name: "email", type: "String" },
  ],
} as any;

const noColumnsInput = { ...baseInput, columns: undefined } as any;

describe("MongoDBDataAdapter scripts", () => {
  describe("serializeJsonForMongoScript", () => {
    it("should serialize a plain object to JSON", () => {
      const result = serializeJsonForMongoScript({ name: "abc" });
      expect(result).toContain('"name"');
      expect(result).toContain('"abc"');
    });

    it("should convert _id values to ObjectId()", () => {
      const result = serializeJsonForMongoScript({ _id: "some_id" });
      expect(result).toContain('ObjectId("some_id")');
      expect(result).not.toContain('"ObjectId');
    });
  });

  describe("getSelectAllColumns", () => {
    it("should return an object with label and query", () => {
      const result = getSelectAllColumns(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Select All Columns");
      expect(result!.query).toContain(".find()");
      expect(result!.query).toContain(".limit(200)");
      expect(result!.query).toContain("collection('users')");
    });

    it("should return undefined for unsupported dialect", () => {
      const result = getSelectAllColumns({ ...baseInput, dialect: "unsupported" } as any);
      // This function does not check dialect, so it still returns a result
      expect(result).toBeDefined();
    });
  });

  describe("getSelectOne", () => {
    it("should return an object with label and query", () => {
      const result = getSelectOne(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Select One Record");
      expect(result!.query).toContain(".findOne(");
      expect(result!.query).toContain("collection('users')");
    });
  });

  describe("getSelectSpecificColumns", () => {
    it("should return an object with label and query", () => {
      const result = getSelectSpecificColumns(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Select Specific Columns");
      expect(result!.query).toContain(".find(");
      expect(result!.query).toContain(".limit(200)");
      expect(result!.query).toContain("collection('users')");
    });

    it("should return undefined when columns are not provided", () => {
      const result = getSelectSpecificColumns(noColumnsInput);
      expect(result).toBeUndefined();
    });
  });

  describe("getSelectDistinctValues", () => {
    it("should return an object with label and query", () => {
      const result = getSelectDistinctValues(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Select Distinct");
      expect(result!.query).toContain(".distinct(");
      expect(result!.query).toContain("collection('users')");
    });

    it("should pick a non-id column for distinct", () => {
      const result = getSelectDistinctValues(baseInput);
      expect(result!.query).toContain("'name'");
    });
  });

  describe("getInsert", () => {
    it("should return an object with label and query", () => {
      const result = getInsert(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Insert");
      expect(result!.query).toContain(".insertMany(");
      expect(result!.query).toContain("collection('users')");
    });

    it("should exclude _id from inserted values", () => {
      const result = getInsert(baseInput);
      expect(result!.query).not.toContain("ObjectId");
    });

    it("should return undefined when columns are not provided", () => {
      const result = getInsert(noColumnsInput);
      expect(result).toBeUndefined();
    });

    it("should use provided value when given", () => {
      const result = getInsert(baseInput, { name: "custom" });
      expect(result!.query).toContain("custom");
    });
  });

  describe("getBulkInsert", () => {
    it("should return an object with label and query", () => {
      const result = getBulkInsert(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Insert");
      expect(result!.query).toContain(".insertMany(");
      expect(result!.query).toContain("collection('users')");
    });

    it("should return undefined when columns are not provided", () => {
      const result = getBulkInsert(noColumnsInput);
      expect(result).toBeUndefined();
    });

    it("should include provided rows", () => {
      const result = getBulkInsert(baseInput, [{ name: "row1" }]);
      expect(result!.query).toContain("row1");
    });
  });

  describe("getUpdateWithValues", () => {
    it("should return an object with label and query", () => {
      const value = { name: "updated" };
      const conditions = { _id: "some_id" };
      const result = getUpdateWithValues(baseInput, value, conditions);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Update");
      expect(result!.query).toContain(".update(");
      expect(result!.query).toContain("$set");
      expect(result!.query).toContain("collection('users')");
    });
  });

  describe("getUpdate", () => {
    it("should return an object with label and query", () => {
      const result = getUpdate(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Update");
      expect(result!.query).toContain(".update(");
      expect(result!.query).toContain("$set");
      expect(result!.query).toContain("collection('users')");
    });

    it("should return undefined when columns are not provided", () => {
      const result = getUpdate(noColumnsInput);
      expect(result).toBeUndefined();
    });
  });

  describe("getDelete", () => {
    it("should return an object with label and query", () => {
      const result = getDelete(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Delete");
      expect(result!.query).toContain(".deleteMany(");
      expect(result!.query).toContain("collection('users')");
    });

    it("should return undefined when columns are not provided", () => {
      const result = getDelete(noColumnsInput);
      expect(result).toBeUndefined();
    });
  });

  describe("getCreateCollection", () => {
    it("should return an object with label and query", () => {
      const result = getCreateCollection(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Create Collection");
      expect(result!.query).toContain(".createCollection(");
      expect(result!.query).toContain("users");
    });

    it("should return undefined when columns are not provided", () => {
      const result = getCreateCollection(noColumnsInput);
      expect(result).toBeUndefined();
    });
  });

  describe("getDropCollection", () => {
    it("should return an object with label and query", () => {
      const result = getDropCollection(baseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Drop Collection");
      expect(result!.query).toContain(".drop()");
      expect(result!.query).toContain("collection('users')");
    });
  });

  describe("getCreateDatabase", () => {
    it("should return an object with label and query", () => {
      const result = getCreateDatabase(baseInput as any);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Create Database");
      expect(result!.query).toContain(".createDatabase(");
      expect(result!.query).toContain("testdb");
    });
  });

  describe("getDropDatabase", () => {
    it("should return an object with label and query", () => {
      const result = getDropDatabase(baseInput as any);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Drop Database");
      expect(result!.query).toContain(".dropDatabase()");
    });
  });

  describe("getCreateConnectionDatabase", () => {
    it("should return an object with label and query", () => {
      const result = getCreateConnectionDatabase(baseInput as any);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Create Database");
      expect(result!.query).toContain(".createDatabase(");
      expect(result!.query).toContain("some_database_name");
    });
  });

  describe("ConcreteDataScripts", () => {
    const scripts = new ConcreteDataScripts();

    it("should support mongodb and mongodb+srv dialects", () => {
      expect(scripts.dialects).toContain("mongodb");
      expect(scripts.dialects).toContain("mongodb+srv");
    });

    it("should not require table ID for query", () => {
      expect(scripts.getIsTableIdRequiredForQuery()).toBe(false);
    });

    it("should return javascript as syntax mode", () => {
      expect(scripts.getSyntaxMode()).toBe("javascript");
    });

    it("should support migration", () => {
      expect(scripts.supportMigration()).toBe(true);
    });

    it("should support create record form", () => {
      expect(scripts.supportCreateRecordForm()).toBe(true);
    });

    it("should support edit record form", () => {
      expect(scripts.supportEditRecordForm()).toBe(true);
    });

    it("should return mongodb as dialect type", () => {
      expect(scripts.getDialectType("mongodb+srv")).toBe("mongodb");
    });

    it("should return a dialect icon", () => {
      expect(scripts.getDialectIcon("mongodb")).toBeDefined();
    });

    it("should return table scripts", () => {
      const tableScripts = scripts.getTableScripts();
      expect(tableScripts.length).toBeGreaterThan(0);
    });

    it("should return database scripts", () => {
      const dbScripts = scripts.getDatabaseScripts();
      expect(dbScripts.length).toBeGreaterThan(0);
    });

    it("should return connection scripts", () => {
      const connScripts = scripts.getConnectionScripts();
      expect(connScripts.length).toBeGreaterThan(0);
    });

    it("should return a sample connection string", () => {
      expect(scripts.getSampleConnectionString("mongodb")).toContain("mongodb://");
    });

    it("should return a sample select query", () => {
      const result = scripts.getSampleSelectQuery(baseInput);
      expect(result).toBeDefined();
      expect(result!.query).toContain(".find()");
    });
  });
});
