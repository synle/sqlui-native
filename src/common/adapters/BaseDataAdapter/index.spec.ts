import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';

describe('BaseDataAdapter', () => {
  describe('getConnectionParameters', () => {
    test('bogus input #1 should not throw errors and return undefined', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        '   bogus1://localhost:9042/system_schema',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`undefined`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`undefined`);
    });

    test('bogus input #2 should not throw errors and return undefined', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'bogus2    ://localhost:9042/system_schema',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`undefined`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`undefined`);
    });

    test('bogus input #3 should not throw errors and return undefined', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'b o g u s 3://localhost:9042/system_schema',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`undefined`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`undefined`);
    });

    test('scheme with dash and plus should work', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'lldp-med://localhost:9042/system_schema',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"lldp-med"`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`"system_schema"`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 9042,
  },
]
`);

      actual = BaseDataAdapter.getConnectionParameters(
        'lldp-med+tcp://localhost:9042/system_schema',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"lldp-med+tcp"`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`"system_schema"`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 9042,
  },
]
`);
    });

    test('basic input should work', async () => {
      let actual = BaseDataAdapter.getConnectionParameters('cassandra://localhost:9042');
      expect(actual?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 9042,
  },
]
`);
    });

    test('input with keyspace', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'cassandra://localhost:9042/system_schema',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`"system_schema"`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 9042,
  },
]
`);
    });

    test('input with username and password', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'cassandra://username:password@localhost:9042',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"password"`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 9042,
  },
]
`);
    });

    test('input with username and password and database', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'cassandra://username:password@localhost:9042/system_schema',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"password"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`"system_schema"`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 9042,
  },
]
`);
    });

    test('input that needs to be encoded properly', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'cassandra://sqlui-native-17823707621378612879:some_strong-PasswordMa+9T=]-G?We4Pp$wcUK==@sqlui-native-17823707621378612879.cassandra.cosmos.azure.com:10350',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"cassandra"`);
      expect(actual?.username).toMatchInlineSnapshot(`"sqlui-native-17823707621378612879"`);
      expect(actual?.password).toMatchInlineSnapshot(
        `"some_strong-PasswordMa+9T=]-G?We4Pp$wcUK=="`,
      );
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "sqlui-native-17823707621378612879.cassandra.cosmos.azure.com",
    "port": 10350,
  },
]
`);
    });

    test('input that needs further encoding', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'mongodb+srv://username:Mgvkgff8gjv6fp4ju4hag97%25t%2FX(EB%40n9)(T(7P)nm2ytsbmd2aw26ncsd54@mongodb.azure.com',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"mongodb+srv"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(
        `"Mgvkgff8gjv6fp4ju4hag97%t/X(EB@n9)(T(7P)nm2ytsbmd2aw26ncsd54"`,
      );
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "mongodb.azure.com",
  },
]
`);
    });

    test('postgresql complex example', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'postgresql://demo:demo13524@127.0.0.1:26257/movr?sslmode=require',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"postgresql"`);
      expect(actual?.username).toMatchInlineSnapshot(`"demo"`);
      expect(actual?.password).toMatchInlineSnapshot(`"demo13524"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`"movr"`);
      expect(actual?.options).toMatchInlineSnapshot(`
Object {
  "sslmode": "require",
}
`);
      expect(actual?.options).toMatchInlineSnapshot(`
Object {
  "sslmode": "require",
}
`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "127.0.0.1",
    "port": 26257,
  },
]
`);
    });

    test('mongodb+srv complex example', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'mongodb+srv://username:password@localhost:27017',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"mongodb+srv"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"password"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 27017,
  },
]
`);
    });

    test('mongodb+srv with no port example', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'mongodb+srv://username:password@localhost',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"mongodb+srv"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"password"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
  },
]
`);
    });

    test('redis simple example', async () => {
      let actual = BaseDataAdapter.getConnectionParameters('redis://localhost:6379');
      expect(actual?.scheme).toMatchInlineSnapshot(`"redis"`);
      expect(actual?.username).toMatchInlineSnapshot(`undefined`);
      expect(actual?.password).toMatchInlineSnapshot(`undefined`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "localhost",
    "port": 6379,
  },
]
`);
    });

    test('rediss complex example', async () => {
      let actual = BaseDataAdapter.getConnectionParameters(
        'rediss://username:password@localhost:6379',
      );
      expect(actual?.scheme).toMatchInlineSnapshot(`"rediss"`);
      expect(actual?.username).toMatchInlineSnapshot(`"username"`);
      expect(actual?.password).toMatchInlineSnapshot(`"password"`);
      expect(actual?.endpoint).toMatchInlineSnapshot(`undefined`);
      expect(actual?.options).toMatchInlineSnapshot(`undefined`);
      expect(actual?.hosts).toMatchInlineSnapshot(`
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
