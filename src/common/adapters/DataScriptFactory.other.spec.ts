import { consolidateDialects, getAllImplementations, getDialectIcon, getDialectName, getDialectType } from 'src/common/adapters/DataScriptFactory';

describe('DataScriptFactory - Other Tests', () => {
  describe('getAllImplementations and consolidateDialects should work properly', () => {
    test('Should not have any overlapping dialect schemes', async () => {
      const allDialects = getAllImplementations().reduce<string[]>(consolidateDialects, []);
      const uniqueDialects = [...new Set(allDialects)];
      expect(allDialects).toStrictEqual(uniqueDialects);
      expect(allDialects.length > 0).toBe(true);
    });
  });

  describe('getDialectType', () => {
    test('bogus', async () => {
      const input1 = `bogus://AccountEndpoint=some_cosmos_endpoint;AccountKey=some_cosmos_account_key`;
      expect(getDialectType(input1)).toMatchInlineSnapshot(`undefined`);

      const input2 = `bogus://username:password@localhost:9042`;
      expect(getDialectType(input2)).toMatchInlineSnapshot(`undefined`);

      const input3 = `bogus1+bogus2://username:password@localhost:9042`;
      expect(getDialectType(input3)).toMatchInlineSnapshot(`undefined`);
    });

    test('cosmosdb', async () => {
      const input = `cosmosdb://AccountEndpoint=some_cosmos_endpoint;AccountKey=some_cosmos_account_key`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"cosmosdb"`);
    });

    test('aztable', async () => {
      const input = `aztable://DefaultEndpointsProtocol=https;AccountName=<your_account_name>;AccountKey=<your_account_key>;EndpointSuffix=core.windows.net`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"aztable"`);
    });

    test('cassandra', async () => {
      const input = `cassandra://username:password@localhost:9042`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"cassandra"`);
    });

    test('mongodb', async () => {
      const input = `mongodb://localhost:27017`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"mongodb"`);
    });

    test('mongodb', async () => {
      const input = `mongodb+srv://localhost:27017`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"mongodb"`);
    });

    test('mssql', async () => {
      const input = `mssql://sa:password123!@localhost:1433`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"mssql"`);
    });

    test('postgres', async () => {
      const input = `postgres://postgres:password@localhost:5432`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"postgres"`);
    });

    test('sqlite', async () => {
      const input = `sqlite://test-db.sqlite`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"sqlite"`);
    });

    test('mariadb', async () => {
      const input = `mariadb://root:password@localhost:3306`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"mariadb"`);
    });

    test('mysql', async () => {
      const input = `mysql://root:password@localhost:3306`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"mysql"`);
    });

    test('redis', async () => {
      const input = `redis://localhost:6379`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"redis"`);
    });

    test('rediss', async () => {
      const input = `rediss://username:password@localhost:6379`;
      expect(getDialectType(input)).toMatchInlineSnapshot(`"rediss"`);
    });
  });

  describe('getDialectName', () => {
    test('undefined', async () => {
      const input = undefined;
      expect(getDialectName(input)).toMatchInlineSnapshot(`""`);
    });

    test('bogus', async () => {
      const input = `bogus`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`""`);
    });

    test('cosmosdb', async () => {
      const input = `cosmosdb`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Azure Cosmos DB"`);
    });

    test('aztable', async () => {
      const input = `aztable`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Azure Table Storage"`);
    });

    test('cassandra', async () => {
      const input = `cassandra`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Cassandra"`);
    });

    test('mongodb', async () => {
      const input = `mongodb`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Mongodb"`);
    });

    test('mongodb', async () => {
      const input = `mongodb+srv`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Mongodb+srv"`);
    });

    test('mssql', async () => {
      const input = `mssql`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Mssql"`);
    });

    test('postgres', async () => {
      const input = `postgres`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Postgres"`);
    });

    test('sqlite', async () => {
      const input = `sqlite`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Sqlite"`);
    });

    test('mariadb', async () => {
      const input = `mariadb`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Mariadb"`);
    });

    test('mysql', async () => {
      const input = `mysql`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Mysql"`);
    });

    test('redis', async () => {
      const input = `redis`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Redis"`);
    });

    test('rediss', async () => {
      const input = `rediss`;
      expect(getDialectName(input)).toMatchInlineSnapshot(`"Redis with SSL"`);
    });
  });

  describe('getDialectIcon', () => {
    test('undefined', async () => {
      const input = undefined;
      expect(getDialectIcon(input)).toMatchInlineSnapshot(`""`);
    });

    test('bogus', async () => {
      const input = `bogus`;
      expect(getDialectIcon(input)).toMatchInlineSnapshot(`""`);
    });

    test('cosmosdb', async () => {
      const input = `cosmosdb`;
      expect(getDialectIcon(input)).toContain(`/cosmosdb.png`);
    });

    test('aztable', async () => {
      const input = `aztable`;
      expect(getDialectIcon(input)).toContain(`/aztable.png`);
    });

    test('cassandra', async () => {
      const input = `cassandra`;
      expect(getDialectIcon(input)).toContain(`/cassandra.png`);
    });

    test('mongodb', async () => {
      const input = `mongodb`;
      expect(getDialectIcon(input)).toContain(`/mongodb.png`);
    });

    test('mongodb', async () => {
      const input = `mongodb+srv`;
      expect(getDialectIcon(input)).toContain(`/mongodb.png`);
    });

    test('mssql', async () => {
      const input = `mssql`;
      expect(getDialectIcon(input)).toContain(`/mssql.png`);
    });

    test('postgres', async () => {
      const input = `postgres`;
      expect(getDialectIcon(input)).toContain(`/postgres.png`);
    });

    test('sqlite', async () => {
      const input = `sqlite`;
      expect(getDialectIcon(input)).toContain(`/sqlite.png`);
    });

    test('mariadb', async () => {
      const input = `mariadb`;
      expect(getDialectIcon(input)).toContain(`/mariadb.png`);
    });

    test('mysql', async () => {
      const input = `mysql`;
      expect(getDialectIcon(input)).toContain(`/mysql.png`);
    });

    test('redis', async () => {
      const input = `redis`;
      expect(getDialectIcon(input)).toContain(`/redis.png`);
    });

    test('rediss', async () => {
      const input = `rediss`;
      expect(getDialectIcon(input)).toContain(`/redis.png`);
    });
  });
});