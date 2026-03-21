import { describe, it, expect, vi } from "vitest";

vi.mock("src/common/adapters/BaseDataAdapter/index", () => ({
  default: {
    getConnectionParameters: vi.fn(),
  },
}));

vi.mock("src/common/adapters/code-snippets/renderCodeSnippet", () => ({
  renderCodeSnippet: vi.fn(),
}));

import {
  getSelectAllColumns,
  getSelectCount,
  getSelectSpecificColumns,
  getSelectDistinctValues,
  getInsert,
  getBulkInsert,
  getUpdate,
  getUpdateWithValues,
  getDelete,
  getCreateTable,
  getDropTable,
  getAddColumn,
  getDropColumns,
  getDropDatabase,
  getCreateDatabase,
  getCreateSampleTable,
  getCreateConnectionDatabase,
} from "src/common/adapters/RelationalDataAdapter/scripts";

const baseTableInput = {
  dialect: "mysql",
  connectionId: "conn1",
  databaseId: "testdb",
  tableId: "users",
  querySize: 200,
  columns: [
    { name: "id", type: "INT", primaryKey: true },
    { name: "name", type: "VARCHAR(100)" },
    { name: "email", type: "VARCHAR(255)" },
  ],
} as any;

const baseDatabaseInput = {
  dialect: "mysql",
  connectionId: "conn1",
  databaseId: "testdb",
} as any;

const baseConnectionInput = {
  dialect: "mysql",
  connectionId: "conn1",
} as any;

describe("RelationalDataAdapter scripts", () => {
  describe("getSelectAllColumns", () => {
    it("returns an object with label and query for mysql", () => {
      const result = getSelectAllColumns(baseTableInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Select All Columns");
      expect(result!.query).toContain("SELECT");
      expect(result!.query).toContain("*");
      expect(result!.query).toContain("FROM users");
      expect(result!.query).toContain("LIMIT 200");
    });

    it("uses TOP instead of LIMIT for mssql", () => {
      const result = getSelectAllColumns({ ...baseTableInput, dialect: "mssql" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("SELECT TOP 200");
      expect(result!.query).toContain("FROM users");
      expect(result!.query).not.toContain("LIMIT");
    });

    it("uses LIMIT for postgres", () => {
      const result = getSelectAllColumns({ ...baseTableInput, dialect: "postgres" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("LIMIT 200");
    });

    it("uses LIMIT for sqlite", () => {
      const result = getSelectAllColumns({ ...baseTableInput, dialect: "sqlite" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("LIMIT 200");
    });

    it("uses LIMIT for mariadb", () => {
      const result = getSelectAllColumns({ ...baseTableInput, dialect: "mariadb" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("LIMIT 200");
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getSelectAllColumns({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getSelectCount", () => {
    it("returns a COUNT(*) query for mysql", () => {
      const result = getSelectCount(baseTableInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Select Count");
      expect(result!.query).toContain("SELECT COUNT(*)");
      expect(result!.query).toContain("FROM users");
      expect(result!.query).toContain("WHERE");
      expect(result!.query).toContain("id = ''");
      expect(result!.query).toContain("name = ''");
    });

    it("returns a COUNT(*) query for mssql", () => {
      const result = getSelectCount({ ...baseTableInput, dialect: "mssql" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("SELECT COUNT(*)");
    });

    it("returns undefined when columns are missing", () => {
      const result = getSelectCount({ ...baseTableInput, columns: undefined });
      expect(result).toBeUndefined();
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getSelectCount({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getSelectSpecificColumns", () => {
    it("returns a query listing each column individually for mysql", () => {
      const result = getSelectSpecificColumns(baseTableInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Select Specific Columns");
      expect(result!.query).toContain("SELECT");
      expect(result!.query).toContain("id");
      expect(result!.query).toContain("name");
      expect(result!.query).toContain("email");
      expect(result!.query).toContain("FROM users");
      expect(result!.query).toContain("WHERE");
      expect(result!.query).toContain("LIMIT 200");
    });

    it("uses TOP for mssql", () => {
      const result = getSelectSpecificColumns({ ...baseTableInput, dialect: "mssql" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("SELECT TOP 200");
      expect(result!.query).not.toContain("LIMIT");
    });

    it("returns undefined when columns are missing", () => {
      const result = getSelectSpecificColumns({ ...baseTableInput, columns: undefined });
      expect(result).toBeUndefined();
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getSelectSpecificColumns({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getSelectDistinctValues", () => {
    it("returns a DISTINCT query on first non-primary-key column for mysql", () => {
      const result = getSelectDistinctValues(baseTableInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Select Distinct");
      expect(result!.query).toContain("SELECT DISTINCT name");
      expect(result!.query).toContain("FROM users");
      expect(result!.query).toContain("LIMIT 200");
    });

    it("uses DISTINCT TOP for mssql", () => {
      const result = getSelectDistinctValues({ ...baseTableInput, dialect: "mssql" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("SELECT DISTINCT TOP 200 name");
      expect(result!.query).not.toContain("LIMIT");
    });

    it("falls back to some_field when all columns are primary keys", () => {
      const input = {
        ...baseTableInput,
        columns: [{ name: "id", type: "INT", primaryKey: true }],
      };
      const result = getSelectDistinctValues(input);
      expect(result).toBeDefined();
      expect(result!.query).toContain("SELECT DISTINCT some_field");
    });

    it("returns undefined when columns are missing", () => {
      const result = getSelectDistinctValues({ ...baseTableInput, columns: undefined });
      expect(result).toBeUndefined();
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getSelectDistinctValues({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getInsert", () => {
    it("returns an INSERT INTO query with placeholder values for mysql", () => {
      const result = getInsert(baseTableInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Insert");
      expect(result!.query).toContain("INSERT INTO users");
      expect(result!.query).toContain("id");
      expect(result!.query).toContain("name");
      expect(result!.query).toContain("email");
      expect(result!.query).toContain("VALUES");
      expect(result!.query).toContain("'_id_'");
      expect(result!.query).toContain("'_name_'");
    });

    it("uses provided values when given", () => {
      const result = getInsert(baseTableInput, { id: 1, name: "Alice", email: "a@b.com" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("'1'");
      expect(result!.query).toContain("'Alice'");
      expect(result!.query).toContain("'a@b.com'");
    });

    it("uses null for null values", () => {
      const result = getInsert(baseTableInput, { id: 1, name: null, email: "a@b.com" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("null");
    });

    it("returns undefined when columns are missing", () => {
      const result = getInsert({ ...baseTableInput, columns: undefined });
      expect(result).toBeUndefined();
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getInsert({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getBulkInsert", () => {
    const rows = [
      { id: 1, name: "Alice", email: "alice@test.com" },
      { id: 2, name: "Bob", email: "bob@test.com" },
    ];

    it("returns a multi-row INSERT query for mysql", () => {
      const result = getBulkInsert(baseTableInput, rows);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Insert");
      expect(result!.query).toContain("INSERT INTO users");
      expect(result!.query).toContain("VALUES");
      expect(result!.query).toContain("'1'");
      expect(result!.query).toContain("'Alice'");
      expect(result!.query).toContain("'Bob'");
    });

    it("uses null for missing column values in rows", () => {
      const partialRows = [{ id: 1, name: "Alice" }];
      const result = getBulkInsert(baseTableInput, partialRows);
      expect(result).toBeDefined();
      expect(result!.query).toContain("null");
    });

    it("returns undefined when rows are empty", () => {
      const result = getBulkInsert(baseTableInput, []);
      expect(result).toBeUndefined();
    });

    it("returns undefined when rows are undefined", () => {
      const result = getBulkInsert(baseTableInput, undefined);
      expect(result).toBeUndefined();
    });

    it("returns undefined when columns are missing", () => {
      const result = getBulkInsert({ ...baseTableInput, columns: undefined }, rows);
      expect(result).toBeUndefined();
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getBulkInsert({ ...baseTableInput, dialect: "mongodb" }, rows);
      expect(result).toBeUndefined();
    });
  });

  describe("getUpdate", () => {
    it("returns an UPDATE query template for mysql", () => {
      const result = getUpdate(baseTableInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Update");
      expect(result!.query).toContain("UPDATE users");
      expect(result!.query).toContain("SET");
      expect(result!.query).toContain("id = ''");
      expect(result!.query).toContain("name = ''");
      expect(result!.query).toContain("WHERE");
    });

    it("works for mssql", () => {
      const result = getUpdate({ ...baseTableInput, dialect: "mssql" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("UPDATE users");
      expect(result!.query).toContain("SET");
      expect(result!.query).toContain("WHERE");
    });

    it("returns undefined when columns are missing", () => {
      const result = getUpdate({ ...baseTableInput, columns: undefined });
      expect(result).toBeUndefined();
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getUpdate({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getUpdateWithValues", () => {
    it("returns an UPDATE query with actual values for mysql", () => {
      const value = { name: "Alice", email: "alice@test.com" };
      const conditions = { id: 1 };
      const result = getUpdateWithValues(baseTableInput, value, conditions);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Update");
      expect(result!.query).toContain("UPDATE users");
      expect(result!.query).toContain("SET");
      expect(result!.query).toContain("name = 'Alice'");
      expect(result!.query).toContain("email = 'alice@test.com'");
      expect(result!.query).toContain("WHERE");
      expect(result!.query).toContain("id = 1");
    });

    it("wraps string condition values in quotes", () => {
      const value = { name: "Bob" };
      const conditions = { email: "bob@test.com" };
      const result = getUpdateWithValues(baseTableInput, value, conditions);
      expect(result).toBeDefined();
      expect(result!.query).toContain("email = 'bob@test.com'");
    });

    it("does not wrap numeric values in quotes", () => {
      const value = { name: "Charlie" };
      const conditions = { id: 42 };
      const result = getUpdateWithValues(baseTableInput, value, conditions);
      expect(result).toBeDefined();
      expect(result!.query).toContain("id = 42");
    });

    it("returns undefined when columns are missing", () => {
      const result = getUpdateWithValues({ ...baseTableInput, columns: undefined }, {}, {});
      expect(result).toBeUndefined();
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getUpdateWithValues({ ...baseTableInput, dialect: "mongodb" }, { name: "x" }, { id: 1 });
      expect(result).toBeUndefined();
    });
  });

  describe("getDelete", () => {
    it("returns a DELETE FROM query for mysql", () => {
      const result = getDelete(baseTableInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Delete");
      expect(result!.query).toContain("DELETE FROM users");
      expect(result!.query).toContain("WHERE");
      expect(result!.query).toContain("id = ''");
      expect(result!.query).toContain("name = ''");
    });

    it("works for mssql", () => {
      const result = getDelete({ ...baseTableInput, dialect: "mssql" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("DELETE FROM users");
    });

    it("returns undefined when columns are missing", () => {
      const result = getDelete({ ...baseTableInput, columns: undefined });
      expect(result).toBeUndefined();
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getDelete({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getCreateTable", () => {
    it("returns a CREATE TABLE query for mysql with AUTO_INCREMENT", () => {
      const input = {
        ...baseTableInput,
        columns: [
          { name: "id", type: "INT", primaryKey: true, autoIncrement: true, allowNull: false },
          { name: "name", type: "VARCHAR(100)", allowNull: true },
        ],
      };
      const result = getCreateTable(input);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Create Table");
      expect(result!.query).toContain("CREATE TABLE users");
      expect(result!.query).toContain("PRIMARY KEY");
      expect(result!.query).toContain("AUTO_INCREMENT");
      expect(result!.query).toContain("NOT NULL");
    });

    it("uses IDENTITY for mssql auto-increment", () => {
      const input = {
        ...baseTableInput,
        dialect: "mssql",
        columns: [
          { name: "id", type: "INT", primaryKey: true, autoIncrement: true, allowNull: false },
          { name: "name", type: "NVARCHAR(100)", allowNull: true },
        ],
      };
      const result = getCreateTable(input);
      expect(result).toBeDefined();
      expect(result!.query).toContain("IDENTITY");
      expect(result!.query).not.toContain("AUTO_INCREMENT");
    });

    it("uses BIGSERIAL PRIMARY KEY for postgres INT primary key", () => {
      const input = {
        ...baseTableInput,
        dialect: "postgres",
        columns: [
          { name: "id", type: "INT", primaryKey: true, allowNull: false },
          { name: "name", type: "VARCHAR(100)", allowNull: true },
        ],
      };
      const result = getCreateTable(input);
      expect(result).toBeDefined();
      expect(result!.query).toContain("BIGSERIAL PRIMARY KEY");
    });

    it("uses AUTOINCREMENT for sqlite", () => {
      const input = {
        ...baseTableInput,
        dialect: "sqlite",
        columns: [
          { name: "id", type: "INT", primaryKey: true, autoIncrement: true, allowNull: false },
          { name: "description", type: "TEXT", allowNull: true },
        ],
      };
      const result = getCreateTable(input);
      expect(result).toBeDefined();
      expect(result!.query).toContain("INTEGER");
      expect(result!.query).toContain("PRIMARY KEY");
      expect(result!.query).toContain("AUTOINCREMENT");
    });

    it("returns undefined when columns are missing", () => {
      const result = getCreateTable({ ...baseTableInput, columns: undefined });
      expect(result).toBeUndefined();
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getCreateTable({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getDropTable", () => {
    it("returns a DROP TABLE query for mysql", () => {
      const result = getDropTable(baseTableInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Drop Table");
      expect(result!.query).toBe("DROP TABLE users");
    });

    it("works for all supported dialects", () => {
      for (const dialect of ["mysql", "mssql", "postgres", "sqlite", "mariadb"]) {
        const result = getDropTable({ ...baseTableInput, dialect });
        expect(result).toBeDefined();
        expect(result!.query).toBe("DROP TABLE users");
      }
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getDropTable({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getAddColumn", () => {
    it("returns ALTER TABLE ADD COLUMN with varchar for mysql", () => {
      const result = getAddColumn(baseTableInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Add Column");
      expect(result!.query).toContain("ALTER TABLE users");
      expect(result!.query).toContain("ADD COLUMN newColumn1");
      expect(result!.query).toContain("varchar(200)");
    });

    it("uses NVARCHAR for mssql", () => {
      const result = getAddColumn({ ...baseTableInput, dialect: "mssql" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("NVARCHAR(200)");
    });

    it("uses CHAR for postgres", () => {
      const result = getAddColumn({ ...baseTableInput, dialect: "postgres" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("CHAR(200)");
    });

    it("uses TEXT for sqlite", () => {
      const result = getAddColumn({ ...baseTableInput, dialect: "sqlite" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("TEXT");
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getAddColumn({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getDropColumns", () => {
    it("returns ALTER TABLE DROP COLUMN for each column for mysql", () => {
      const result = getDropColumns(baseTableInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Drop Column");
      expect(result!.query).toContain("ALTER TABLE users");
      expect(result!.query).toContain("DROP COLUMN id;");
      expect(result!.query).toContain("DROP COLUMN name;");
      expect(result!.query).toContain("DROP COLUMN email;");
    });

    it("returns undefined when columns are missing", () => {
      const result = getDropColumns({ ...baseTableInput, columns: undefined });
      expect(result).toBeUndefined();
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getDropColumns({ ...baseTableInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getDropDatabase", () => {
    it("returns a DROP DATABASE query for mysql", () => {
      const result = getDropDatabase(baseDatabaseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Drop Database");
      expect(result!.query).toBe("DROP DATABASE testdb");
    });

    it("works for all supported dialects", () => {
      for (const dialect of ["mysql", "mssql", "postgres", "sqlite", "mariadb"]) {
        const result = getDropDatabase({ ...baseDatabaseInput, dialect });
        expect(result).toBeDefined();
        expect(result!.query).toBe("DROP DATABASE testdb");
      }
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getDropDatabase({ ...baseDatabaseInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getCreateDatabase", () => {
    it("returns a CREATE DATABASE query for mysql", () => {
      const result = getCreateDatabase(baseDatabaseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Create Database");
      expect(result!.query).toBe("CREATE DATABASE testdb");
    });

    it("works for all supported dialects", () => {
      for (const dialect of ["mysql", "mssql", "postgres", "sqlite", "mariadb"]) {
        const result = getCreateDatabase({ ...baseDatabaseInput, dialect });
        expect(result).toBeDefined();
        expect(result!.query).toBe("CREATE DATABASE testdb");
      }
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getCreateDatabase({ ...baseDatabaseInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });

  describe("getCreateSampleTable", () => {
    it("returns a CREATE TABLE for mocked_table with AUTO_INCREMENT for mysql", () => {
      const result = getCreateSampleTable(baseDatabaseInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Create Table");
      expect(result!.query).toContain("CREATE TABLE mocked_table");
      expect(result!.query).toContain("AUTO_INCREMENT");
      expect(result!.skipGuide).toBe(true);
    });

    it("uses IDENTITY for mssql", () => {
      const result = getCreateSampleTable({ ...baseDatabaseInput, dialect: "mssql" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("IDENTITY");
    });

    it("uses BIGSERIAL for postgres", () => {
      const result = getCreateSampleTable({ ...baseDatabaseInput, dialect: "postgres" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("BIGSERIAL PRIMARY KEY");
    });

    it("uses INTEGER PRIMARY KEY for sqlite", () => {
      const result = getCreateSampleTable({ ...baseDatabaseInput, dialect: "sqlite" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("INTEGER PRIMARY KEY");
    });

    it("uses AUTO_INCREMENT for mariadb", () => {
      const result = getCreateSampleTable({ ...baseDatabaseInput, dialect: "mariadb" });
      expect(result).toBeDefined();
      expect(result!.query).toContain("AUTO_INCREMENT");
    });

    it("returns an empty query for unsupported dialect", () => {
      const result = getCreateSampleTable({ ...baseDatabaseInput, dialect: "mongodb" });
      expect(result).toBeDefined();
      expect(result!.query).toBe("");
    });
  });

  describe("getCreateConnectionDatabase", () => {
    it("returns a CREATE DATABASE template for mysql", () => {
      const result = getCreateConnectionDatabase(baseConnectionInput);
      expect(result).toBeDefined();
      expect(result!.label).toBe("Create Database");
      expect(result!.query).toBe("CREATE DATABASE some_database_name");
    });

    it("works for all supported dialects", () => {
      for (const dialect of ["mysql", "mssql", "postgres", "sqlite", "mariadb"]) {
        const result = getCreateConnectionDatabase({ ...baseConnectionInput, dialect });
        expect(result).toBeDefined();
        expect(result!.query).toBe("CREATE DATABASE some_database_name");
      }
    });

    it("returns undefined for unsupported dialect", () => {
      const result = getCreateConnectionDatabase({ ...baseConnectionInput, dialect: "mongodb" });
      expect(result).toBeUndefined();
    });
  });
});
