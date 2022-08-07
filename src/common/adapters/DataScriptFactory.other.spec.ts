import {
  consolidateDialects,
  getAllImplementations,
  getDialectType,
} from 'src/common/adapters/DataScriptFactory';

describe('DataScriptFactory - Other Tests', () => {
  describe('getAllImplementations and consolidateDialects should work properly', () => {
    test('Should not have any overlapping dialect schemes', async () => {
      const allDialects = getAllImplementations().reduce<string[]>(consolidateDialects, []);
      const uniqueDialects = [...new Set(allDialects)];
      expect(allDialects).toStrictEqual(uniqueDialects);
    });
  });

  describe('getDialectType', () => {
    test('cosmosdb', async () => {
      const dialect = `cosmosdb`;
      const connection = `cosmosdb://AccountEndpoint=some_cosmos_endpoint;AccountKey=some_cosmos_account_key`;
      expect(getDialectType(connection, dialect)).toBe(dialect);
    });

    test('aztable', async () => {
      const dialect = `aztable`;
      const connection = `aztable://DefaultEndpointsProtocol=https;AccountName=<your_account_name>;AccountKey=<your_account_key>;EndpointSuffix=core.windows.net`;
      expect(getDialectType(connection, dialect)).toBe(dialect);
    });

    test('cassandra', async () => {
      const dialect = `cassandra`;
      const connection = `cassandra://username:password@localhost:9042`;
      expect(getDialectType(connection, dialect)).toBe(dialect);
    });

    test('mongodb', async () => {
      const dialect = `mongodb`;
      const connection = `mongodb://localhost:27017`;
      expect(getDialectType(connection, dialect)).toBe(dialect);
    });

    test('mssql', async () => {
      const dialect = `mssql`;
      const connection = `mssql://sa:password123!@localhost:1433`;
      expect(getDialectType(connection, dialect)).toBe(dialect);
    });

    test('postgres', async () => {
      const dialect = `postgres`;
      const connection = `postgres://postgres:password@localhost:5432`;
      expect(getDialectType(connection, dialect)).toBe(dialect);
    });

    test('sqlite', async () => {
      const dialect = `sqlite`;
      const connection = `sqlite://test-db.sqlite`;
      expect(getDialectType(connection, dialect)).toBe(dialect);
    });

    test('mariadb', async () => {
      const dialect = `mariadb`;
      const connection = `mariadb://root:password@localhost:3306`;
      expect(getDialectType(connection, dialect)).toBe(dialect);
    });

    test('mysql', async () => {
      const dialect = `mysql`;
      const connection = `mysql://root:password@localhost:3306`;
      expect(getDialectType(connection, dialect)).toBe(dialect);
    });
  });
});
