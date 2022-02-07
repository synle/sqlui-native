import * as hooks from 'src/hooks';

describe('hooks', () => {
  describe('getExportedConnection', () => {
    test('should work', async () => {
      const actual = hooks.getExportedConnection({
        id: 'connection.1643485467072.6333713976068809',
        connection: 'mysql://root:password@localhost:3306',
        name: 'sy mysql 123',
        status: 'online',
        dialect: 'mysql',
      });
      expect(actual).toMatchSnapshot();
    });
  });

  describe('getExportedQuery', () => {
    test('should work', async () => {
      const actual = hooks.getExportedQuery({
        id: 'query.1643737746323.6184509846791006',
        name: 'Query 2/1/2022, 9:49:06 AM',
        sql: 'SELECT\n  TOP 200 *\nFROM\n  albums',
        connectionId: 'connection.1644098335891.8887562323718656',
        databaseId: 'musicstores',
      });
      expect(actual).toMatchSnapshot();
    });
  });
});
