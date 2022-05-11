---
title: sqlui-native
---

Query Guides:
=============
## mysql

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
  table1 (column1, column2)
VALUES
  ('_column1_', '_column2_')
```


### Update

```js
UPDATE table1
SET id = '',
  column1 = '',
  column2 = ''
WHERE id = ''
AND
column1 = ''
AND
column2 = ''
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
  table1 (column1, column2)
VALUES
  ('_column1_', '_column2_')
```


### Update

```js
UPDATE table1
SET id = '',
  column1 = '',
  column2 = ''
WHERE id = ''
AND
column1 = ''
AND
column2 = ''
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
  table1 (column1, column2)
VALUES
  ('_column1_', '_column2_')
```


### Update

```js
UPDATE table1
SET id = '',
  column1 = '',
  column2 = ''
WHERE id = ''
AND
column1 = ''
AND
column2 = ''
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
  table1 (column1, column2)
VALUES
  ('_column1_', '_column2_')
```


### Update

```js
UPDATE table1
SET id = '',
  column1 = '',
  column2 = ''
WHERE id = ''
AND
column1 = ''
AND
column2 = ''
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
  id INT NOT NULL,
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
  table1 (column1, column2)
VALUES
  ('_column1_', '_column2_')
```


### Update

```js
UPDATE table1
SET id = '',
  column1 = '',
  column2 = ''
WHERE id = ''
AND
column1 = ''
AND
column2 = ''
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

### Create Keyspace

```sql
CREATE KEYSPACE IF NOT EXISTS some_keyspace WITH replication = { 'class': 'SimpleStrategy',
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
  ('_id_', '_column1_', '_column2_')
```


### Update

```js
UPDATE table1
SET id = '',
  column1 = '',
  column2 = ''
WHERE id = ''
AND
column1 = ''
AND
column2 = ''
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


## mongodb

### Create Database

```js
db.createDatabase('database1')
```


### Drop Database

```js
db.dropDatabase()
```


### Select All Columns

```js
db.collection('table1')
  .find()
  .limit(200)
  .toArray();
```


### Select Specific Columns

```js
db.collection('table1')
  .find({
    "id": 123,
    "column1": 123,
    "column2": 123
  })
  .limit(200)
  .toArray();
```


### Select Distinct

```js
db.collection('table1')
  .distinct(
    'id', {
      "id": "",
      "column1": "",
      "column2": ""
    }
  )
```


### Insert

```js
db.collection('table1')
  .insertMany([{
    "id": 123,
    "column1": 123,
    "column2": 123
  }]);
```


### Update

```js
db.collection('table1')
  .update({
    "id": 123,
    "column1": 123,
    "column2": 123
  }, {
    $set: {
      "id": 123,
      "column1": 123,
      "column2": 123
    }
  });
```


### Delete

```js
db.collection('table1')
  .deleteMany({
    "id": 123,
    "column1": 123,
    "column2": 123
  });
```


### Create Collection

```js
db.createCollection("table1")
```


### Drop Collection

```js
db.collection('table1')
  .drop()
```


## redis

### Set Value

```js
db.set("key", "value123")
```


### Get Value by Key

```js
db.get("key")
```


### Scan for keys

```js
db.keys("*")
```


### Hashset > Set Value

```js
db.hSet("hash_key1", "field1", "value1")
```


### Hashset > Get Value By Key

```js
db.hGetAll("hash_key1")
```


### Hashset > Values

```js
db.hVals("hash_key1")
```


### Hashset > Check if key exists

```js
db.hExists("hash_key1", "field1")
```


### List > Get Items

```js
db.lRange("list_key1", 0, -1)
```


### List > Push item to the front

```js
db.lPush("list_key1", "value")
```


### List > Push item to the back

```js
db.rPush("list_key1", "value")
```


### List > Delete item from the front

```js
db.lPop("list_key1")
```


### List > Delete item from the back

```js
db.rPop("list_key1")
```


### Set > Get Items

```js
db.sMembers("set_key1")
```


### Set > Add Item

```js
db.sAdd("set_key1", "value1")
```


### Set > Is a member of set

```js
db.sIsMember("set_key1", "value1")
```


### Set > Total Size

```js
db.sCard("set_key1")
```


### Set > Remove last item

```js
db.sPop("set_key1")
```


### Sorted Set > Get Items

```js
db.zRange("sorted_set_key1", 0, -1)
```


### Sorted Set > Add Item

```js
db.zAdd("sorted_set_key1", [{
  score: 1,
  value: "some_value"
}])
```


### Publish a message

```js
db.publish("pubsub_channel_key1", "some_message")
```


## cosmosdb

### Select All Columns

```js
client
  .database('database1')
  .container('table1')
  .items
  .query({
    query: 'SELECT * from c OFFSET 1 LIMIT 5',
  })
  .fetchAll()
```


### Insert

```js
client
  .database('database1')
  .container('table1')
  .items
  .create({
    id: '123',
    name: 'test'
  })
```


### Update

```js
client
  .database('database1')
  .container('table1')
  .item('id_123', 'category')
  .replace({
    id: 'id_123',
    name: 'new_name'
  })
```


### Insert

```js
client
  .database('database1')
  .container('table1')
  .item('id_123', 'category')
  .delete()
```


### Raw Select All Columns SQL

```sql
SELECT
  *
FROM
  c
```

