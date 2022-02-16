import BaseDataAdapter from 'commons/adapters/BaseDataAdapter';

describe('BaseDataAdapter', () => {
  describe('getConnectionParameters', () => {
    test('basic input should work ', async () => {
      const config = BaseDataAdapter.getConnectionParameters('cassandra://localhost:9042');
      expect(config?.scheme).toBe('cassandra');
      expect(config?.hosts).toMatchSnapshot();
    });

    test('input with keyspace', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'cassandra://localhost:9042/system_schema',
      );
      expect(config?.scheme).toBe('cassandra');
      expect(config?.endpoint).toBe('system_schema');
      expect(config?.hosts).toMatchSnapshot();
    });

    test('input with username and password', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'cassandra://username:password@localhost:9042',
      );
      expect(config?.scheme).toBe('cassandra');
      expect(config?.username).toBe('username');
      expect(config?.password).toBe('password');
      expect(config?.hosts).toMatchSnapshot();
    });

    test('input with username and password and database', async () => {
      const config = BaseDataAdapter.getConnectionParameters(
        'cassandra://username:password@localhost:9042/system_schema',
      );
      expect(config?.scheme).toBe('cassandra');
      expect(config?.username).toBe('username');
      expect(config?.password).toBe('password');
      expect(config?.endpoint).toBe('system_schema');
      expect(config?.hosts).toMatchSnapshot();
    });
  });

  describe('resolveTypes', () => {
    test('primitive types only', async () => {
      const actual = BaseDataAdapter.resolveTypes({
        _id: '620d36396027dda455d46763',
        name: 'sy le',
        zipcode: 95037,
      });
      expect(actual).toStrictEqual({
        _id: { name: '_id', type: 'string' },
        name: { name: 'name', type: 'string' },
        zipcode: { name: 'zipcode', type: 'number' },
      });
    });

    test('arrays', async () => {
      const actual = BaseDataAdapter.resolveTypes({ genre: ['aa', 'bb', 'cc'] });
      expect(actual).toStrictEqual({ genre: { name: 'genre', type: 'array' } });
    });

    test('nested objects', async () => {
      const actual = BaseDataAdapter.resolveTypes({
        _id: '620d36396027dda455d46763',
        name: 'sy le',
        location: { zip: 95037, county: { name: 'santa clara' } },
        genre: ['aa', 'bb', 'cc'],
      });
      expect(actual).toStrictEqual({
        _id: { name: '_id', type: 'string' },
        genre: { name: 'genre', type: 'array' },
        'location.county.name': { name: 'location.county.name', type: 'string' },
        'location.zip': { name: 'location.zip', type: 'number' },
        name: { name: 'name', type: 'string' },
      });
    });
  });
});
