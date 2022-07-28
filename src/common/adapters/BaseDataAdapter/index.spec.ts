import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';

describe('BaseDataAdapter', () => {
  describe('getConnectionParameters', () => {
    test('basic input should work', async () => {
      const config = BaseDataAdapter.getConnectionParameters('cassandra://localhost:9042');
      expect(config?.scheme).toBe('cassandra');
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
      expect(config?.scheme).toBe('cassandra');
      expect(config?.endpoint).toBe('system_schema');
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
      expect(config?.scheme).toBe('cassandra');
      expect(config?.username).toBe('username');
      expect(config?.password).toBe('password');
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
      expect(config?.scheme).toBe('cassandra');
      expect(config?.username).toBe('username');
      expect(config?.password).toBe('password');
      expect(config?.endpoint).toBe('system_schema');
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
      const config = BaseDataAdapter.getConnectionParameters('cassandra://sqlui-native-17823707621378612879:some_strong-PasswordMa+9T=]-G?We4Pp$wcUK==@sqlui-native-17823707621378612879.cassandra.cosmos.azure.com:10350');
      expect(config?.scheme).toBe('cassandra');
      expect(config?.username).toMatchInlineSnapshot(`"sqlui-native-17823707621378612879"`)
      expect(config?.password).toMatchInlineSnapshot(`"some_strong-PasswordMa+9T=]-G?We4Pp$wcUK=="`)
      expect(config?.hosts).toMatchInlineSnapshot(`
Array [
  Object {
    "host": "sqlui-native-17823707621378612879.cassandra.cosmos.azure.com",
    "port": 10350,
  },
]
`)
    });

  });
});
