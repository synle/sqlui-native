/** Mustache template for a JavaScript/Node.js code snippet connecting to relational databases via Sequelize. */
export const relational = `\
// install these extra dependencies if needed
// npm install --save sequelize {{{deps}}}
const {Sequelize} = require('sequelize');

async function _doWork(){
  const sequelize = new Sequelize('{{{connectionString}}}');

  try{
    const [items, meta] = await sequelize.query(\`{{{sql}}}\`, {
      raw: true,
      plain: false,
    });

    for(const item of items){
      console.log(item);
    }
  } catch(err){
    console.log('Failed to run query', err);
  }
}

_doWork();`;

/** Mustache template for a JavaScript/Node.js code snippet connecting to Cassandra. */
export const cassandra = `\
// npm install --save cassandra-driver
const cassandra = require('cassandra-driver')

async function _doWork(){
  try {
    const clientOptions = {{{clientOptionsJson}}};
    const client = new cassandra.Client({
      contactPoints: clientOptions.contactPoints,
      keyspace: clientOptions.keyspace,
      authProvider: clientOptions.authProvider ? new cassandra.auth.PlainTextAuthProvider(
        clientOptions.authProvider.username,
        clientOptions.authProvider.password,
      ): undefined,
      sslOptions: {
        rejectUnauthorized: false, // optional, check to see if you need to disable this SSL check
      }
    });
    await new Promise((resolve, reject) => {
      client.connect((err) => err ? reject(err): resolve());
    })

    const res = await client.execute(\`{{{sql}}}\`);
    console.log(res);
  } catch(err){
    console.log('Failed to connect', err);
  }
}

_doWork();`;

/** Mustache template for a JavaScript/Node.js code snippet connecting to MongoDB. */
export const mongodb = `\
// npm install --save mongodb
const { MongoClient, ObjectId } = require('mongodb');

async function _doWork(){
  try {
    const database = '{{{database}}}';

    const client = new MongoClient('{{{connectionString}}}');
    await client.connect();
    const db = await client.db(database);
    const res = await {{{sql}}};

    const items = [].concat(res);
    for(const item of items){
      console.log(item);
    }
  } catch(err){
    console.log('Failed to connect', err);
  }
}

_doWork();`;

/** Mustache template for a JavaScript/Node.js code snippet connecting to Redis. */
export const redis = `\
// npm install --save redis
const { createClient, RedisClientType } = require('redis');

async function _doWork(){
  try {
    const db = await new Promise((resolve, reject) => {
      const client = createClient({{{clientOptionsJson}}});
      client.connect();
      client.on('ready', () => resolve(client));
      client.on('error', (err) => reject(err));
    });

    const res = await {{{sql}}};
    console.log(res);
  } catch(err){
    console.log('Failed to connect', err);
  }
}

_doWork();`;

/** Mustache template for a JavaScript/Node.js code snippet connecting to Azure Cosmos DB. */
export const cosmosdb = `\
// npm install --save @azure/cosmos
const { CosmosClient } = require('@azure/cosmos');

async function _doWork(){
  const client = new CosmosClient('{{{connectionString}}}');

  const res = await {{{sql}}};

  try{
    const items = [].concat(res.item || res.resource || res.resources);
    for(const item of items){
      console.log(item);
    }
  } catch(err){
    client.dispose();
    console.log('Fail to connect to database');
  }
}

_doWork();`;

/** Mustache template for a JavaScript/Node.js code snippet connecting to Salesforce via jsforce. */
export const sfdc = `\
// npm install --save jsforce
const jsforce = require('jsforce');

async function _doWork(){
  const conn = new jsforce.Connection({
    loginUrl: 'https://login.salesforce.com'
  });

  try {
    await conn.login('your_username', 'your_password' + 'your_security_token');

    // SOQL Query
    const result = await conn.query(\`{{{sql}}}\`);
    console.log('Total records:', result.totalSize);
    for (const record of result.records) {
      console.log(record);
    }

    // Insert
    // const created = await conn.sobject('Account').create({ Name: 'New Account' });
    // console.log('Created:', created.id);

    // Update
    // const updated = await conn.sobject('Account').update({ Id: 'some_id', Name: 'Updated Name' });
    // console.log('Updated:', updated.success);

    // Delete
    // const deleted = await conn.sobject('Account').destroy('some_id');
    // console.log('Deleted:', deleted.success);

    // SOSL Search
    // const searchResult = await conn.search('FIND {keyword} IN ALL FIELDS RETURNING Account(Id, Name)');
    // console.log('Search:', searchResult.searchRecords);

    await conn.logout();
  } catch(err) {
    console.log('Failed to connect', err);
  }
}

_doWork();`;

/** Mustache template for a JavaScript/Node.js code snippet connecting to Azure Table Storage. */
export const aztable = `\
// npm install --save @azure/data-tables
const { TableClient, TableServiceClient } = require('@azure/data-tables');

async function _doWork(){
  const connectionString = '{{{connectionString}}}';
  const table = '{{{tableId}}}'

  const serviceClient = TableServiceClient.fromConnectionString(connectionString);
  const tableClient = table ? TableClient.fromConnectionString(connectionString, table) : undefined;

  try{
    const res = {{{sql}}};
    for await (const item of res) {
      console.log(item);
    }
  } catch(err){
    console.log('Failed to connect', err)
  }
}

_doWork();`;
