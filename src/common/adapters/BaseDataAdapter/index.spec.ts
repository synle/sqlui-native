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

  describe('resolveTypes', () => {
    test('primitive types only', async () => {
      const actual = BaseDataAdapter.resolveTypes({
        _id: '620d36396027dda455d46763',
        name: 'sy le',
        zipcode: 95037,
      });
      expect(actual).toMatchInlineSnapshot(`
Object {
  "_id": Object {
    "name": "_id",
    "propertyPath": Array [
      "_id",
    ],
    "type": "string",
  },
  "name": Object {
    "name": "name",
    "propertyPath": Array [
      "name",
    ],
    "type": "string",
  },
  "zipcode": Object {
    "name": "zipcode",
    "propertyPath": Array [
      "zipcode",
    ],
    "type": "number",
  },
}
`);
    });

    test('arrays', async () => {
      const actual = BaseDataAdapter.resolveTypes({ genre: ['aa', 'bb', 'cc'] });
      expect(actual).toMatchInlineSnapshot(`
Object {
  "genre": Object {
    "name": "genre",
    "propertyPath": Array [
      "genre",
    ],
    "type": "array",
  },
}
`);
    });

    test('nested objects', async () => {
      const actual = BaseDataAdapter.resolveTypes({
        _id: '620d36396027dda455d46763',
        name: 'sy le',
        location: { zip: 95037, county: { name: 'santa clara' } },
        genre: ['aa', 'bb', 'cc'],
      });
      expect(actual).toMatchInlineSnapshot(`
Object {
  "_id": Object {
    "name": "_id",
    "propertyPath": Array [
      "_id",
    ],
    "type": "string",
  },
  "genre": Object {
    "name": "genre",
    "propertyPath": Array [
      "genre",
    ],
    "type": "array",
  },
  "location/county/name": Object {
    "name": "location/county/name",
    "nested": true,
    "propertyPath": Array [
      "location",
      "county",
      "name",
    ],
    "type": "string",
  },
  "location/zip": Object {
    "name": "location/zip",
    "nested": true,
    "propertyPath": Array [
      "location",
      "zip",
    ],
    "type": "number",
  },
  "name": Object {
    "name": "name",
    "propertyPath": Array [
      "name",
    ],
    "type": "string",
  },
}
`);
    });
  });
});