/** Mustache template for a JavaScript/Node.js code snippet connecting to MySQL via mysql2. */
export const mysql = `\
// npm install --save mysql2
const mysql = require('mysql2/promise');

async function _doWork(){
  const connection = await mysql.createConnection('{{{connectionString}}}');

  try{
    const [rows] = await connection.query(\`{{{sql}}}\`);

    for(const item of rows){
      console.log(item);
    }
  } catch(err){
    console.log('Failed to run query', err);
  } finally {
    await connection.end();
  }
}

_doWork();`;

/** Mustache template for a JavaScript/Node.js code snippet connecting to PostgreSQL via pg. */
export const postgres = `\
// npm install --save pg
const { Client } = require('pg');

async function _doWork(){
  const client = new Client({ connectionString: '{{{connectionString}}}' });
  await client.connect();

  try{
    const res = await client.query(\`{{{sql}}}\`);

    for(const item of res.rows){
      console.log(item);
    }
  } catch(err){
    console.log('Failed to run query', err);
  } finally {
    await client.end();
  }
}

_doWork();`;

/** Mustache template for a JavaScript/Node.js code snippet connecting to SQLite via better-sqlite3. */
export const sqlite = `\
// npm install --save better-sqlite3
const Database = require('better-sqlite3');

function _doWork(){
  const db = new Database('{{{storagePath}}}');

  try{
    const rows = db.prepare(\`{{{sql}}}\`).all();

    for(const item of rows){
      console.log(item);
    }
  } catch(err){
    console.log('Failed to run query', err);
  } finally {
    db.close();
  }
}

_doWork();`;

/** Mustache template for a JavaScript/Node.js code snippet connecting to MSSQL via tedious. */
export const mssql = `\
// npm install --save tedious
const { Connection, Request } = require('tedious');

function _doWork(){
  const config = {
    server: '{{{host}}}',
    authentication: {
      type: 'default',
      options: { userName: '{{{username}}}', password: '{{{password}}}' }
    },
    options: {
      port: {{{port}}},
      database: '{{{database}}}',
      encrypt: false,
      trustServerCertificate: true,
      rowCollectionOnRequestCompletion: true
    }
  };

  const connection = new Connection(config);
  connection.on('connect', (err) => {
    if(err){ console.log('Failed to connect', err); return; }

    const request = new Request(\`{{{sql}}}\`, (err, rowCount, rows) => {
      if(err){ console.log('Failed to run query', err); return; }

      for(const row of rows){
        const item = {};
        for(const col of row){ item[col.metadata.colName] = col.value; }
        console.log(item);
      }

      connection.close();
    });

    connection.execSql(request);
  });

  connection.connect();
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
