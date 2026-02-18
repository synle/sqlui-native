---
title: sqlui-native
---

# Query Guides:

## mysql

### Sample Connection String

This is a sample connection string you can use.

```
mysql://root:password@localhost:3306
```

### Drop Database

```sql
DROP DATABASE database1
```

### Create Database

```sql
CREATE DATABASE database1
```

### Select All Columns

```sql
SELECT
  *
FROM
  table1
LIMIT
  200
```

### Select Count

```sql
SELECT
  COUNT(*)
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Select Specific Columns

```sql
SELECT
  id,
  column1,
  column2
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
LIMIT
  200
```

### Select Distinct

```sql
SELECT
  DISTINCT column1
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
LIMIT
  200
```

### Insert

```sql
INSERT INTO
  table1 (id, column1, column2)
VALUES
  ('_id_', '_column1_', '_column2_')
```

### Update

```sql
UPDATE
  table1
SET
  id = '',
  column1 = '',
  column2 = ''
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Delete

```sql
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Create Table

```sql
CREATE TABLE table1 (
  id INT PRIMARY KEY NOT NULL,
  column1 INT NOT NULL,
  column2 VARCHAR(100) NOT NULL
)
```

### Drop Table

```sql
DROP TABLE table1
```

### Add Column

```sql
ALTER TABLE
  table1
ADD
  COLUMN newColumn1 varchar(200)
```

### Drop Column

```sql
ALTER TABLE
  table1 DROP COLUMN id;
ALTER TABLE
  table1 DROP COLUMN column1;
ALTER TABLE
  table1 DROP COLUMN column2;
```

## mariadb

### Sample Connection String

This is a sample connection string you can use.

```
mariadb://root:password@localhost:3306
```

### Drop Database

```sql
DROP DATABASE database1
```

### Create Database

```sql
CREATE DATABASE database1
```

### Select All Columns

```sql
SELECT
  *
FROM
  table1
LIMIT
  200
```

### Select Count

```sql
SELECT
  COUNT(*)
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Select Specific Columns

```sql
SELECT
  id,
  column1,
  column2
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
LIMIT
  200
```

### Select Distinct

```sql
SELECT
  DISTINCT column1
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
LIMIT
  200
```

### Insert

```sql
INSERT INTO
  table1 (id, column1, column2)
VALUES
  ('_id_', '_column1_', '_column2_')
```

### Update

```sql
UPDATE
  table1
SET
  id = '',
  column1 = '',
  column2 = ''
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Delete

```sql
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Create Table

```sql
CREATE TABLE table1 (
  id INT PRIMARY KEY NOT NULL,
  column1 INT NOT NULL,
  column2 VARCHAR(100) NOT NULL
)
```

### Drop Table

```sql
DROP TABLE table1
```

### Add Column

```sql
ALTER TABLE
  table1
ADD
  COLUMN newColumn1 varchar(200)
```

### Drop Column

```sql
ALTER TABLE
  table1 DROP COLUMN id;
ALTER TABLE
  table1 DROP COLUMN column1;
ALTER TABLE
  table1 DROP COLUMN column2;
```

## mssql

### Sample Connection String

This is a sample connection string you can use.

```
mssql://sa:password123!@localhost:1433
```

### Drop Database

```sql
DROP DATABASE database1
```

### Create Database

```sql
CREATE DATABASE database1
```

### Select All Columns

```sql
SELECT
  TOP 200 *
FROM
  table1
```

### Select Count

```sql
SELECT
  COUNT(*)
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Select Specific Columns

```sql
SELECT
  TOP 200 id,
  column1,
  column2
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Select Distinct

```sql
SELECT
  DISTINCT TOP 200 column1
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Insert

```sql
INSERT INTO
  table1 (id, column1, column2)
VALUES
  ('_id_', '_column1_', '_column2_')
```

### Update

```sql
UPDATE
  table1
SET
  id = '',
  column1 = '',
  column2 = ''
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Delete

```sql
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Create Table

```sql
CREATE TABLE table1 (
  id INT PRIMARY KEY NOT NULL,
  column1 INT NOT NULL,
  column2 VARCHAR(100) NOT NULL
)
```

### Drop Table

```sql
DROP TABLE table1
```

### Add Column

```sql
ALTER TABLE
  table1
ADD
  COLUMN newColumn1 NVARCHAR(200)
```

### Drop Column

```sql
ALTER TABLE
  table1 DROP COLUMN id;
ALTER TABLE
  table1 DROP COLUMN column1;
ALTER TABLE
  table1 DROP COLUMN column2;
```

## postgres

### Sample Connection String

This is a sample connection string you can use.

```
postgres://postgres:password@localhost:5432
```

### Drop Database

```sql
DROP DATABASE database1
```

### Create Database

```sql
CREATE DATABASE database1
```

### Select All Columns

```sql
SELECT
  *
FROM
  table1
LIMIT
  200
```

### Select Count

```sql
SELECT
  COUNT(*)
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Select Specific Columns

```sql
SELECT
  id,
  column1,
  column2
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
LIMIT
  200
```

### Select Distinct

```sql
SELECT
  DISTINCT column1
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
LIMIT
  200
```

### Insert

```sql
INSERT INTO
  table1 (id, column1, column2)
VALUES
  ('_id_', '_column1_', '_column2_')
```

### Update

```sql
UPDATE
  table1
SET
  id = '',
  column1 = '',
  column2 = ''
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Delete

```sql
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Create Table

```sql
CREATE TABLE table1 (
  id BIGSERIAL PRIMARY KEY,
  column1 INT NOT NULL,
  column2 VARCHAR(100) NOT NULL
)
```

### Drop Table

```sql
DROP TABLE table1
```

### Add Column

```sql
ALTER TABLE
  table1
ADD
  COLUMN newColumn1 CHAR(200)
```

### Drop Column

```sql
ALTER TABLE
  table1 DROP COLUMN id;
ALTER TABLE
  table1 DROP COLUMN column1;
ALTER TABLE
  table1 DROP COLUMN column2;
```

## sqlite

### Sample Connection String

This is a sample connection string you can use.

```
sqlite://test-db.sqlite
```

### Drop Database

```sql
DROP DATABASE database1
```

### Create Database

```sql
CREATE DATABASE database1
```

### Select All Columns

```sql
SELECT
  *
FROM
  table1
LIMIT
  200
```

### Select Count

```sql
SELECT
  COUNT(*)
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Select Specific Columns

```sql
SELECT
  id,
  column1,
  column2
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
LIMIT
  200
```

### Select Distinct

```sql
SELECT
  DISTINCT column1
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
LIMIT
  200
```

### Insert

```sql
INSERT INTO
  table1 (id, column1, column2)
VALUES
  ('_id_', '_column1_', '_column2_')
```

### Update

```sql
UPDATE
  table1
SET
  id = '',
  column1 = '',
  column2 = ''
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Delete

```sql
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Create Table

```sql
CREATE TABLE table1 (
  id INTEGER PRIMARY KEY NOT NULL,
  column1 INTEGER NOT NULL,
  column2 VARCHAR(100) NOT NULL
)
```

### Drop Table

```sql
DROP TABLE table1
```

### Add Column

```sql
ALTER TABLE
  table1
ADD
  COLUMN newColumn1 TEXT
```

### Drop Column

```sql
ALTER TABLE
  table1 DROP COLUMN id;
ALTER TABLE
  table1 DROP COLUMN column1;
ALTER TABLE
  table1 DROP COLUMN column2;
```

## cassandra

### Sample Connection String

This is a sample connection string you can use.

```
cassandra://username:password@localhost:9042
```

### Create Keyspace

```sql
CREATE KEYSPACE IF NOT EXISTS database1 WITH replication = { 'class': 'SimpleStrategy',
'replication_factor': 3 };
```

### Drop Keyspace

```sql
DROP KEYSPACE IF EXISTS database1;
```

### Select All Columns

```sql
SELECT
  *
FROM
  table1
LIMIT
  200
```

### Select Specific Columns

```sql
SELECT
  id,
  column1,
  column2
FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
LIMIT
  200
```

### Insert

```sql
INSERT INTO
  table1 (id, column1, column2)
VALUES
  (123, 123, '_column2_')
```

### Update

```sql
UPDATE
  table1
SET
  id = 123,
  column1 = 123,
  column2 = '_column2_'
WHERE
  id = 123
  AND column1 = 123
  AND column2 = '_column2_'
```

### Delete

```sql
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```

### Create Table

```sql
CREATE TABLE table1 (id INT PRIMARY KEY, column1 INT, column2 VARCHAR(100))
```

### Drop Table

```sql
DROP TABLE table1
```

### Add Column

```sql
ALTER TABLE
  table1
ADD
  new_column1 TEXT
```

### Drop Column

```sql
ALTER TABLE
  table1 DROP id;
ALTER TABLE
  table1 DROP column1;
ALTER TABLE
  table1 DROP column2;
```

## mongodb

### Sample Connection String

This is a sample connection string you can use.

```
mongodb://username:password@localhost:27017
```

### Create Database

```js
db.createDatabase("database1");
```

### Drop Database

```js
db.dropDatabase();
```

### Select All Columns

```js
db.collection("table1").find().limit(200).toArray();
```

### Select Specific Columns

```js
db.collection("table1")
  .find({
    id: 123,
    column1: 123,
    column2: 123,
  })
  .limit(200)
  .toArray();
```

### Select Distinct

```js
db.collection("table1").distinct("column1", {
  id: "",
  column1: "",
  column2: "",
});
```

### Select One Record

```js
db.collection("table1").findOne({
  _id: ObjectId("some_id"),
});
```

### Insert

```js
db.collection("table1").insertMany([
  {
    id: 123,
    column1: 123,
    column2: 123,
  },
]);
```

### Update

```js
db.collection("table1").update(
  {
    id: 123,
    column1: 123,
    column2: 123,
    _id: ObjectId("some_id"),
  },
  {
    $set: {
      id: 123,
      column1: 123,
      column2: 123,
    },
  },
);
```

### Delete

```js
db.collection("table1").deleteMany({
  id: 123,
  column1: 123,
  column2: 123,
});
```

### Create Collection

```js
db.createCollection("table1");
```

### Drop Collection

```js
db.collection("table1").drop();
```

## redis

### Sample Connection String

This is a sample connection string you can use.

```
redis://localhost:6379
```

### Set Value

```js
db.set("key", "value123");
```

### Get Value by Key

```js
db.get("key");
```

### Scan for keys

```js
db.keys("*");
```

### Hashset > Set Value

```js
db.hSet("hash_key1", "field1", "value1");
```

### Hashset > Get Value By Key

```js
db.hGetAll("hash_key1");
```

### Hashset > Values

```js
db.hVals("hash_key1");
```

### Hashset > Check if key exists

```js
db.hExists("hash_key1", "field1");
```

### List > Get Items

```js
db.lRange("list_key1", 0, -1);
```

### List > Push item to the front

```js
db.lPush("list_key1", "value");
```

### List > Push item to the back

```js
db.rPush("list_key1", "value");
```

### List > Delete item from the front

```js
db.lPop("list_key1");
```

### List > Delete item from the back

```js
db.rPop("list_key1");
```

### Set > Get Items

```js
db.sMembers("set_key1");
```

### Set > Add Item

```js
db.sAdd("set_key1", "value1");
```

### Set > Is a member of set

```js
db.sIsMember("set_key1", "value1");
```

### Set > Total Size

```js
db.sCard("set_key1");
```

### Set > Remove last item

```js
db.sPop("set_key1");
```

### Sorted Set > Get Items

```js
db.zRange("sorted_set_key1", 0, -1);
```

### Sorted Set > Add Item

```js
db.zAdd("sorted_set_key1", [
  {
    score: 1,
    value: "some_value",
  },
]);
```

### Publish a message

```js
db.publish("pubsub_channel_key1", "some_message");
```

## cosmosdb

### Sample Connection String

This is a sample connection string you can use.

```
cosmosdb://AccountEndpoint=some_cosmos_endpoint;AccountKey=some_cosmos_account_key
```

### Create Database

```js
client.databases.create({
  id: "database1",
});
```

### Create Database Container

```js
client.database("database1").containers.create({
  id: "some_container_name",
});
```

### Drop Database

```js
client.database("database1").delete();
```

### Select All Columns

```js
client
  .database("database1")
  .container("table1")
  .items.query({
    query: `
  SELECT *
  FROM c
  OFFSET 0 LIMIT 200`,
  })
  .fetchAll();
```

### Select Specific Columns

```js
client
  .database("database1")
  .container("table1")
  .items.query({
    query: `
  SELECT c.id,
  c.column1,
  c.column2
  FROM c
  WHERE c.id = ''
  AND c.column1 = ''
  AND c.column2 = ''
  OFFSET 0 LIMIT 200`,
  })
  .fetchAll();
```

### Select By Id

```js
client
  .database("database1")
  .container("table1")
  .items.query({
    query: `
  SELECT *
  FROM c
  WHERE c.id = '123'`,
  })
  .fetchAll();
```

### Read

```js
client.database("database1").container("table1").item("some_id", "some_partition_key").read();
```

### Insert

```js
client.database("database1").container("table1").items.create({});
```

### Update

```js
client.database("database1").container("table1").item("some_id", "some_partition_key").replace({
  id: "some_id",
});
```

### Delete

```js
client.database("database1").container("table1").item("some_id", "some_partition_key").delete();
```

### Raw Select All Columns SQL

```sql
SELECT
  *
FROM
  c
```

### Create Container

```js
client.database("database1").containers.create({
  id: "table1",
});
```

### Drop Container

```js
client.database("database1").container("table1").delete();
```

## aztable

### Sample Connection String

This is a sample connection string you can use.

```
aztable://DefaultEndpointsProtocol=https;AccountName=<your_account_name>;AccountKey=<your_account_key>;EndpointSuffix=core.windows.net
```

### Create Table

```js
serviceClient.createTable("somenewtablename");
```

### Select All Columns

```js
tableClient.listEntities({
  queryOptions: {
    filter: ``,
  },
});
```

### Select Specific Columns

```js
tableClient.listEntities({
  queryOptions: {
    filter: `PartitionKey eq 'some_partition_key'`,
    select: ["id", "column1", "column2"],
  },
});
```

### Insert

```js
tableClient.createEntity({
  rowKey: "some_row_key",
  partitionKey: "some_partition_key",
});
```

### Update

```js
tableClient.updateEntity({
  rowKey: "some_row_key",
  partitionKey: "some_partition_key",
});
```

### Upsert

```js
tableClient.upsertEntity(
  {
    rowKey: "some_row_key",
    partitionKey: "some_partition_key",
  },
  "Replace",
);
```

### Delete

```js
tableClient.deleteEntity("some_partition_key", "some_row_key");
```

### Create Table

```js
serviceClient.createTable("table1");
```

### Drop Table

```js
serviceClient.deleteTable("table1");
```
