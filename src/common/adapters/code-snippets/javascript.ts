export const relational = `\
// install these extra dependencies if needed
// npm install --save sequelize
{{{deps}}}
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
