import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';

describe('BaseDataAdapter', () => {
  describe('getConnectionParameters', () => {
    test('basic input should work', async () => {
      const config = BaseDataAdapter.getConnectionParameters('cassandra://localhost:9042');
      expect(config?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 9042,
  },
]
`);
    });

    test('input with keyspace', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'cassandra://localhost:9042/system_schema',
      );
      expect(config?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(config?.endpoint).toMatchInlineSnapshot(`"system_schema"`);
      expect(config?.options).toMatchInlineSnapshot(`undefined`);
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 9042,
  },
]
`);
    });

    test('input with username and password', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'cassandra://username:password@localhost:9042',
      );
      expect(config?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(config?.username).toMatchInlineSnapshot(`"username"`);
      expect(config?.password).toMatchInlineSnapshot(`"password"`);
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 9042,
  },
]
`);
    });

    test('input with username and password and database', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'cassandra://username:password@localhost:9042/system_schema',
      );
      expect(config?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(config?.username).toMatchInlineSnapshot(`"username"`);
      expect(config?.password).toMatchInlineSnapshot(`"password"`);
      expect(config?.endpoint).toMatchInlineSnapshot(`"system_schema"`);
      expect(config?.options).toMatchInlineSnapshot(`undefined`);
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 9042,
  },
]
`);
    });

    test('input that needs to be encoded properly', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'cassandra://sqlui-native-17823707621378612879:some_strong-PasswordMa+9T=]-G?We4Pp$wcUK==@sqlui-native-17823707621378612879.cassandra.cosmos.azure.com:10350',
      );
      expect(config?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(config?.username).toMatchInlineSnapshot(`"sqlui-native-17823707621378612879"`);
      expect(config?.password).toMatchInlineSnapshot(
        `"some_strong-PasswordMa+9T=]-G?We4Pp$wcUK=="`,
      );
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "sqlui-native-17823707621378612879.cassandra.cosmos.azure.com",
    "port": 10350,
  },
]
`);
    });

    test('input that needs further encoding', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'mongodb+srv://username:Mgvkgff8gjv6fp4ju4hag97%25t%2FX(EB%40n9)(T(7P)nm2ytsbmd2aw26ncsd54@mongodb.azure.com',
      );
      expect(config?.scheme).toMatchInlineSnapshot(`"mongodb+srv"`);
      expect(config?.username).toMatchInlineSnapshot(`"username"`);
      expect(config?.password).toMatchInlineSnapshot(`"Mgvkgff8gjv6fp4ju4hag97%t/X(EB@n9)(T(7P)nm2ytsbmd2aw26ncsd54"`);
      expect(config?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(config?.options).toMatchInlineSnapshot(`undefined`);
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "mongodb.azure.com",
  },
]
`);
    });

    test('postgresql complex example', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'postgresql://demo:demo13524@127.0.0.1:26257/movr?sslmode=require',
      );
      expect(config?.scheme).toMatchInlineSnapshot(`"postgresql"`);
      expect(config?.username).toMatchInlineSnapshot(`"demo"`);
      expect(config?.password).toMatchInlineSnapshot(`"demo13524"`);
      expect(config?.endpoint).toMatchInlineSnapshot(`"movr"`);
      expect(config?.options).toMatchInlineSnapshot(`
Object {
  "sslmode": "require",
}
`);
      expect(config?.options).toMatchInlineSnapshot(`
Object {
  "sslmode": "require",
}
`);
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "127.0.0.1",
    "port": 26257,
  },
]
`);
    });

    test('mongodb+srv complex example', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'mongodb+srv://username:password@localhost:27017',
      );
      expect(config?.scheme).toMatchInlineSnapshot(`"mongodb+srv"`);
      expect(config?.username).toMatchInlineSnapshot(`"username"`);
      expect(config?.password).toMatchInlineSnapshot(`"password"`);
      expect(config?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(config?.options).toMatchInlineSnapshot(`undefined`);
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 27017,
  },
]
`);
    });

    test('mongodb+srv with no port example', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'mongodb+srv://username:password@localhost',
      );
      expect(config?.scheme).toMatchInlineSnapshot(`"mongodb+srv"`);
      expect(config?.username).toMatchInlineSnapshot(`"username"`);
      expect(config?.password).toMatchInlineSnapshot(`"password"`);
      expect(config?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(config?.options).toMatchInlineSnapshot(`undefined`);
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
  },
]
`);
    });

    test('redis simple example', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'redis://localhost:6379',
      );
      expect(config?.scheme).toMatchInlineSnapshot(`"redis"`);
      expect(config?.username).toMatchInlineSnapshot(`undefined`);
      expect(config?.password).toMatchInlineSnapshot(`undefined`);
      expect(config?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(config?.options).toMatchInlineSnapshot(`undefined`);
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 6379,
  },
]
`);
    });

    test('rediss complex example', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'rediss://username:password@localhost:6379',
      );
      expect(config?.scheme).toMatchInlineSnapshot(`"rediss"`);
      expect(config?.username).toMatchInlineSnapshot(`"username"`);
      expect(config?.password).toMatchInlineSnapshot(`"password"`);
      expect(config?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(config?.options).toMatchInlineSnapshot(`undefined`);
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 6379,
  },
]
`);
    });
  });
});
