import * as commonUtils from "src/frontend/utils/commonUtils";

describe("commonUtils", () => {
  describe("getExportedConnection", () => {
    test("should work with minimal inputs", async () => {
      const actual = commonUtils.getExportedConnection({
        id: "connection.1643485467072.6333713976068809",
        connection: "mysql://root:password@localhost:3306",
        name: "sy mysql 123",
        status: "online",
        dialect: "mysql",
      });
      expect(actual).toStrictEqual({
        _type: "connection",
        connection: "mysql://root:password@localhost:3306",
        id: "connection.1643485467072.6333713976068809",
        name: "sy mysql 123",
      });
    });
  });

  describe("getExportedQuery", () => {
    test("should work with minimal inputs", async () => {
      const actual = commonUtils.getExportedQuery({
        id: "some_query_id",
        name: "Query 2/1/2022, 9:49:06 AM",
        sql: "SELECT\n  TOP 200 *\nFROM\n  albums",
        connectionId: "some_connection_id",
        databaseId: "some_database_id",
      });
      expect(actual).toMatchInlineSnapshot(`
        {
          "_type": "query",
          "connectionId": "some_connection_id",
          "databaseId": "some_database_id",
          "id": "some_query_id",
          "name": "Query 2/1/2022, 9:49:06 AM",
          "sql": "SELECT
          TOP 200 *
        FROM
          albums",
          "tableId": undefined,
        }
      `);
    });

    test("should work with more completed data inputs", async () => {
      //@ts-ignore
      const actual = commonUtils.getExportedQuery({
        id: "some_query_id",
        name: "Query 2/1/2022, 9:49:06 AM",
        sql: "SELECT\n  TOP 200 *\nFROM\n  albums",
        connectionId: "some_connection_id",
        selected: true,
        databaseId: "some_database_id",
        executionStart: 123,
        executionEnd: 456,
        result: {
          ok: true,
          raw: [{ aa: 777 }],
        },
      });
      expect(actual).toMatchInlineSnapshot(`
        {
          "_type": "query",
          "connectionId": "some_connection_id",
          "databaseId": "some_database_id",
          "id": "some_query_id",
          "name": "Query 2/1/2022, 9:49:06 AM",
          "sql": "SELECT
          TOP 200 *
        FROM
          albums",
          "tableId": undefined,
        }
      `);
    });

    test("should also include tableId", async () => {
      const actual = commonUtils.getExportedQuery({
        id: "some_query_id",
        name: "Query 2/1/2022, 9:49:06 AM",
        sql: "SELECT\n  TOP 200 *\nFROM\n  albums",
        connectionId: "some_connection_id",
        databaseId: "some_database_id",
        tableId: "some_table_id",
      });
      expect(actual).toMatchInlineSnapshot(`
        {
          "_type": "query",
          "connectionId": "some_connection_id",
          "databaseId": "some_database_id",
          "id": "some_query_id",
          "name": "Query 2/1/2022, 9:49:06 AM",
          "sql": "SELECT
          TOP 200 *
        FROM
          albums",
          "tableId": "some_table_id",
        }
      `);
    });
  });

  describe("getUpdatedOrdersForList", () => {
    let items;

    beforeEach(() => {
      items = [11, 22, 33, 44, 55];
    });

    test("should work for from=4, to=2", async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 4, 2);
      expect(actual.join(",")).toMatchInlineSnapshot(`"11,22,55,33,44"`);
    });

    test("should work for from=4, to=3", async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 4, 3);
      expect(actual.join(",")).toMatchInlineSnapshot(`"11,22,33,55,44"`);
    });

    test("should work for from=4, to=0", async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 4, 0);
      expect(actual.join(",")).toMatchInlineSnapshot(`"55,11,22,33,44"`);
    });

    test("should work for from=0, to=1", async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 0, 1);
      expect(actual.join(",")).toMatchInlineSnapshot(`"22,11,33,44,55"`);
    });

    test("should work for from=0, to=4", async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 0, 4);
      expect(actual.join(",")).toMatchInlineSnapshot(`"22,33,44,55,11"`);
    });

    test("should work for from=0, to=3", async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 0, 3);
      expect(actual.join(",")).toMatchInlineSnapshot(`"22,33,44,11,55"`);
    });

    test("should work for from=1, to=3", async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 1, 3);
      expect(actual.join(",")).toMatchInlineSnapshot(`"11,33,44,22,55"`);
    });

    test("should work for from=0, to=0 (no change in order)", async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 0, 0);
      expect(actual.join(",")).toMatchInlineSnapshot(`"11,22,33,44,55"`);
    });

    test("should work for from=3, to=3 (no change in order)", async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 3, 3);
      expect(actual.join(",")).toMatchInlineSnapshot(`"11,22,33,44,55"`);
    });

    test("should work for from=4, to=4 (no change in order)", async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 4, 4);
      expect(actual.join(",")).toMatchInlineSnapshot(`"11,22,33,44,55"`);
    });
  });

  describe("getGeneratedRandomId", () => {
    test("should start with the given prefix", () => {
      const id = commonUtils.getGeneratedRandomId("connection");
      expect(id.startsWith("connection.")).toBe(true);
    });

    test("should generate unique ids", () => {
      const id1 = commonUtils.getGeneratedRandomId("test");
      const id2 = commonUtils.getGeneratedRandomId("test");
      expect(id1).not.toEqual(id2);
    });

    test("should have three parts separated by dots", () => {
      const id = commonUtils.getGeneratedRandomId("prefix");
      const parts = id.split(".");
      expect(parts.length).toEqual(3);
      expect(parts[0]).toEqual("prefix");
      // second part is timestamp
      expect(Number(parts[1])).toBeGreaterThan(0);
      // third part is random number
      expect(Number(parts[2])).toBeGreaterThanOrEqual(0);
    });
  });

  describe("sortColumnNamesForUnknownData", () => {
    test("should put _id and id first", () => {
      const actual = commonUtils.sortColumnNamesForUnknownData(["name", "email", "_id", "id"]);
      expect(actual[0]).toEqual("_id");
      expect(actual[1]).toEqual("id");
    });

    test("should put special column names in order", () => {
      const actual = commonUtils.sortColumnNamesForUnknownData(["etag", "partitionKey", "rowKey", "_id"]);
      expect(actual).toEqual(["_id", "rowKey", "partitionKey", "etag"]);
    });

    test("should put columns ending with 'id' before other columns", () => {
      const actual = commonUtils.sortColumnNamesForUnknownData(["name", "userId", "email", "orderId"]);
      expect(actual.indexOf("userId")).toBeLessThan(actual.indexOf("name"));
      expect(actual.indexOf("orderId")).toBeLessThan(actual.indexOf("email"));
    });

    test("should sort non-special columns alphabetically", () => {
      const actual = commonUtils.sortColumnNamesForUnknownData(["zebra", "apple", "mango"]);
      expect(actual).toEqual(["apple", "mango", "zebra"]);
    });

    test("should handle empty array", () => {
      const actual = commonUtils.sortColumnNamesForUnknownData([]);
      expect(actual).toEqual([]);
    });

    test("should handle single item", () => {
      const actual = commonUtils.sortColumnNamesForUnknownData(["name"]);
      expect(actual).toEqual(["name"]);
    });

    test("should handle mixed special and regular columns", () => {
      const actual = commonUtils.sortColumnNamesForUnknownData([
        "description",
        "id",
        "userId",
        "name",
        "_id",
        "createdAt",
      ]);
      // _id first, then id, then columns ending in Id, then alphabetical
      expect(actual[0]).toEqual("_id");
      expect(actual[1]).toEqual("id");
      expect(actual.indexOf("userId")).toBeLessThan(actual.indexOf("name"));
    });
  });
});
