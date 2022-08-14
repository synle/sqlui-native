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
      const connection = `cosmosdb://AccountEndpoint=some_cosmos_endpoint;AccountKey=some_cosmos_account_key`;
      expect(getDialectType(connection)).toMatchInlineSnapshot(`"cosmosdb"`);
    });

    test('aztable', async () => {
      const connection = `aztable://DefaultEndpointsProtocol=https;AccountName=<your_account_name>;AccountKey=<your_account_key>;EndpointSuffix=core.windows.net`;
      expect(getDialectType(connection)).toMatchInlineSnapshot(`"aztable"`);
    });

    test('cassandra', async () => {
      const connection = `cassandra://username:password@localhost:9042`;
      expect(getDialectType(connection)).toMatchInlineSnapshot(`"cassandra"`);
    });

    test('mongodb', async () => {
      const connection = `mongodb://localhost:27017`;
      expect(getDialectType(connection)).toMatchInlineSnapshot(`"mongodb"`);
    });

    test('mongodb', async () => {
      const connection = `mongodb+srv://localhost:27017`;
      expect(getDialectType(connection)).toMatchInlineSnapshot(`"mongodb"`);
    });

    test('mssql', async () => {
      const connection = `mssql://sa:password123!@localhost:1433`;
      expect(getDialectType(connection)).toMatchInlineSnapshot(`"mssql"`);
    });

    test('postgres', async () => {
      const connection = `postgres://postgres:password@localhost:5432`;
      expect(getDialectType(connection)).toMatchInlineSnapshot(`"postgres"`);
    });

    test('sqlite', async () => {
      const connection = `sqlite://test-db.sqlite`;
      expect(getDialectType(connection)).toMatchInlineSnapshot(`"sqlite"`);
    });

    test('mariadb', async () => {
      const connection = `mariadb://root:password@localhost:3306`;
      expect(getDialectType(connection)).toMatchInlineSnapshot(`"mariadb"`);
    });

    test('mysql', async () => {
      const connection = `mysql://root:password@localhost:3306`;
      expect(getDialectType(connection)).toMatchInlineSnapshot(`"mysql"`);
    });
  });
});
