import { MongoClient } from 'mongodb';
import MongoDataAdapter from 'commons/adapters/MongoDataAdapter';

const adapter = new MongoDataAdapter('mongodb://localhost:27017');
adapter.authenticate();

describe('mongodb', () => {


  test('Get database', async () => {

  });
});
