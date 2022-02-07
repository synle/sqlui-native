import { MongoClient } from 'mongodb';
import MongoDataAdapter from 'commons/adapters/MongoDataAdapter';

describe('mongodb', () => {
  test('Get database', async () => {
    const url = 'mongodb://localhost:27017';

    MongoClient.connect(url, function (err, db) {
      if (err) throw err;
      // var dbo = db.db('mydb');
      // var myobj = { name: 'Company Inc', address: 'Highway 37' };
      // dbo.collection('customers').insertOne(myobj, function (err, res) {
      //   if (err) throw err;
      //   console.log('1 document inserted');
      //   db.close();
      // });
    });
  });
});
