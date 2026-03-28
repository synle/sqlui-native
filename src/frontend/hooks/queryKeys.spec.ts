import { queryKeys } from "src/frontend/hooks/queryKeys";

describe("queryKeys", () => {
  describe("connections", () => {
    test("all returns static key", () => {
      expect(queryKeys.connections.all).toEqual(["connections"]);
    });

    test("byId returns connectionId as key", () => {
      expect(queryKeys.connections.byId("c1")).toEqual(["c1"]);
    });
  });

  describe("databases", () => {
    test("list returns connectionId + databases", () => {
      expect(queryKeys.databases.list("c1")).toEqual(["c1", "databases"]);
    });
  });

  describe("tables", () => {
    test("list returns connectionId + databaseId + tables", () => {
      expect(queryKeys.tables.list("c1", "db1")).toEqual(["c1", "db1", "tables"]);
    });
  });

  describe("columns", () => {
    test("list returns connectionId + databaseId + tableId + columns", () => {
      expect(queryKeys.columns.list("c1", "db1", "t1")).toEqual(["c1", "db1", "t1", "columns"]);
    });

    test("allForDatabase returns connectionId + databaseId + allTableColumns", () => {
      expect(queryKeys.columns.allForDatabase("c1", "db1")).toEqual(["c1", "db1", "allTableColumns"]);
    });
  });

  describe("schema", () => {
    test("cached returns connectionId + databaseId + cachedSchema", () => {
      expect(queryKeys.schema.cached("c1", "db1")).toEqual(["c1", "db1", "cachedSchema"]);
    });
  });

  test("key factories return distinct arrays on each call", () => {
    const a = queryKeys.databases.list("c1");
    const b = queryKeys.databases.list("c1");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
