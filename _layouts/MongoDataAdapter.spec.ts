import { MongoClient } from 'mongodb';
import MongoDataAdapter from 'commons/adapters/MongoDataAdapter';

describe('mongodb', () => {
  const adapter = new MongoDataAdapter('mongodb://localhost:27017');

  test('Get database', async () => {
    const databases = await adapter.getDatabases();
    expect(databases).toBe(1)
  });
});
