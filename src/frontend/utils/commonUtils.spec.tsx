import * as commonUtils from 'src/frontend/utils/commonUtils';

describe('commonUtils', () => {
  describe('getExportedConnection', () => {
    test('should work with minimal inputs', async () => {
      const actual = commonUtils.getExportedConnection({
        id: 'connection.1643485467072.6333713976068809',
        connection: 'mysql://root:password@localhost:3306',
        name: 'sy mysql 123',
        status: 'online',
        dialect: 'mysql',
      });
      expect(actual).toStrictEqual({
        _type: 'connection',
        connection: 'mysql://root:password@localhost:3306',
        id: 'connection.1643485467072.6333713976068809',
        name: 'sy mysql 123',
      });
    });
  });

  describe('getExportedQuery', () => {
    test('should work with minimal inputs', async () => {
      const actual = commonUtils.getExportedQuery({
        id: 'some_query_id',
        name: 'Query 2/1/2022, 9:49:06 AM',
        sql: 'SELECT\n  TOP 200 *\nFROM\n  albums',
        connectionId: 'some_connection_id',
        databaseId: 'some_database_id',
      });
      expect(actual).toMatchInlineSnapshot(`
Object {
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

    test('should work with more completed data inputs', async () => {
      //@ts-ignore
      const actual = commonUtils.getExportedQuery({
        id: 'some_query_id',
        name: 'Query 2/1/2022, 9:49:06 AM',
        sql: 'SELECT\n  TOP 200 *\nFROM\n  albums',
        connectionId: 'some_connection_id',
        selected: true,
        databaseId: 'some_database_id',
        executionStart: 123,
        executionEnd: 456,
        result: {
          ok: true,
          raw: [{ aa: 777 }],
        },
      });
      expect(actual).toMatchInlineSnapshot(`
Object {
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

    test('should also include tableId', async () => {
      const actual = commonUtils.getExportedQuery({
        id: 'some_query_id',
        name: 'Query 2/1/2022, 9:49:06 AM',
        sql: 'SELECT\n  TOP 200 *\nFROM\n  albums',
        connectionId: 'some_connection_id',
        databaseId: 'some_database_id',
        tableId: 'some_table_id',
      });
      expect(actual).toMatchInlineSnapshot(`
Object {
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

  describe('getUpdatedOrdersForList', () => {
    let items;

    beforeEach(() => {
      items = [11, 22, 33, 44, 55];
    });

    test('should work for from=4, to=2', async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 4, 2);
      expect(actual.join(',')).toMatchInlineSnapshot(`"11,22,55,33,44"`);
    });

    test('should work for from=4, to=3', async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 4, 3);
      expect(actual.join(',')).toMatchInlineSnapshot(`"11,22,33,55,44"`);
    });

    test('should work for from=4, to=0', async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 4, 0);
      expect(actual.join(',')).toMatchInlineSnapshot(`"55,11,22,33,44"`);
    });

    test('should work for from=0, to=1', async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 0, 1);
      expect(actual.join(',')).toMatchInlineSnapshot(`"22,11,33,44,55"`);
    });

    test('should work for from=0, to=4', async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 0, 4);
      expect(actual.join(',')).toMatchInlineSnapshot(`"22,33,44,55,11"`);
    });

    test('should work for from=0, to=3', async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 0, 3);
      expect(actual.join(',')).toMatchInlineSnapshot(`"22,33,44,11,55"`);
    });

    test('should work for from=1, to=3', async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 1, 3);
      expect(actual.join(',')).toMatchInlineSnapshot(`"11,33,44,22,55"`);
    });

    test('should work for from=0, to=0 (no change in order)', async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 0, 0);
      expect(actual.join(',')).toMatchInlineSnapshot(`"11,22,33,44,55"`);
    });

    test('should work for from=3, to=3 (no change in order)', async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 3, 3);
      expect(actual.join(',')).toMatchInlineSnapshot(`"11,22,33,44,55"`);
    });

    test('should work for from=4, to=4 (no change in order)', async () => {
      let actual = commonUtils.getUpdatedOrdersForList(items, 4, 4);
      expect(actual.join(',')).toMatchInlineSnapshot(`"11,22,33,44,55"`);
    });
  });
});
