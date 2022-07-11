import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';

describe('BaseDataAdapter', () => {
  describe('getConnectionParameters', () => {
    test('basic input should work ', async () => {
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
  });
});