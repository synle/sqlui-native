---
title: sqlui-native
---

Query Guides:
=============
## mysql

### Select All Columns

```
SELECT
  *
FROM
  table1
LIMIT
  200
```


### Select Count

```
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

```
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

```
INSERT INTO
  table1 (column1, column2)
VALUES
  ('_column1_', '_column2_')
```


### Update

```
UPDATE table1 SET id = '', column1 = '', column2 = ''
WHERE id = ''
AND column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```


### Create Table

```
CREATE TABLE table1 (
  id INT PRIMARY KEY NOT NULL,
  column1 INT NOT NULL,
  column2 VARCHAR(100) NOT NULL
)
```


### Drop Table

```
DROP TABLE table1
```


### Add Column

```
ALTER TABLE
  table1
ADD
  COLUMN newColumn1 varchar(200)
```


### Drop Column

```
ALTER TABLE
  table1 DROP COLUMN id;
ALTER TABLE
  table1 DROP COLUMN column1;
ALTER TABLE
  table1 DROP COLUMN column2;
```


## mariadb

### Select All Columns

```
SELECT
  *
FROM
  table1
LIMIT
  200
```


### Select Count

```
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

```
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

```
INSERT INTO
  table1 (column1, column2)
VALUES
  ('_column1_', '_column2_')
```


### Update

```
UPDATE table1 SET id = '', column1 = '', column2 = ''
WHERE id = ''
AND column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```


### Create Table

```
CREATE TABLE table1 (
  id INT PRIMARY KEY NOT NULL,
  column1 INT NOT NULL,
  column2 VARCHAR(100) NOT NULL
)
```


### Drop Table

```
DROP TABLE table1
```


### Add Column

```
ALTER TABLE
  table1
ADD
  COLUMN newColumn1 varchar(200)
```


### Drop Column

```
ALTER TABLE
  table1 DROP COLUMN id;
ALTER TABLE
  table1 DROP COLUMN column1;
ALTER TABLE
  table1 DROP COLUMN column2;
```


## mssql

### Select All Columns

```
SELECT
  TOP 200 *
FROM
  table1
```


### Select Count

```
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

```
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


### Insert

```
INSERT INTO
  table1 (column1, column2)
VALUES
  ('_column1_', '_column2_')
```


### Update

```
UPDATE table1 SET id = '', column1 = '', column2 = ''
WHERE id = ''
AND column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```


### Create Table

```
CREATE TABLE table1 (
  id INT PRIMARY KEY NOT NULL,
  column1 INT NOT NULL,
  column2 VARCHAR(100) NOT NULL
)
```


### Drop Table

```
DROP TABLE table1
```


### Add Column

```
ALTER TABLE
  table1
ADD
  COLUMN newColumn1 NVARCHAR(200)
```


### Drop Column

```
ALTER TABLE
  table1 DROP COLUMN id;
ALTER TABLE
  table1 DROP COLUMN column1;
ALTER TABLE
  table1 DROP COLUMN column2;
```


## postgres

### Select All Columns

```
SELECT
  *
FROM
  table1
LIMIT
  200
```


### Select Count

```
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

```
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

```
INSERT INTO
  table1 (column1, column2)
VALUES
  ('_column1_', '_column2_')
```


### Update

```
UPDATE table1 SET id = '', column1 = '', column2 = ''
WHERE id = ''
AND column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```


### Create Table

```
CREATE TABLE table1 (
  id INT NOT NULL,
  column1 INT NOT NULL,
  column2 VARCHAR(100) NOT NULL
)
```


### Drop Table

```
DROP TABLE table1
```


### Add Column

```
ALTER TABLE
  table1
ADD
  COLUMN newColumn1 CHAR(200)
```


### Drop Column

```
ALTER TABLE
  table1 DROP COLUMN id;
ALTER TABLE
  table1 DROP COLUMN column1;
ALTER TABLE
  table1 DROP COLUMN column2;
```


## sqlite

### Select All Columns

```
SELECT
  *
FROM
  table1
LIMIT
  200
```


### Select Count

```
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

```
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

```
INSERT INTO
  table1 (column1, column2)
VALUES
  ('_column1_', '_column2_')
```


### Update

```
UPDATE table1 SET id = '', column1 = '', column2 = ''
WHERE id = ''
AND column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```


### Create Table

```
CREATE TABLE table1 (
  id INT PRIMARY KEY NOT NULL,
  column1 INT NOT NULL,
  column2 VARCHAR(100) NOT NULL
)
```


### Drop Table

```
DROP TABLE table1
```


### Add Column

```
ALTER TABLE
  table1
ADD
  COLUMN newColumn1 TEXT
```


### Drop Column

```
ALTER TABLE
  table1 DROP COLUMN id;
ALTER TABLE
  table1 DROP COLUMN column1;
ALTER TABLE
  table1 DROP COLUMN column2;
```


## cassandra

### Select All Columns

```
SELECT
  *
FROM
  table1
LIMIT
  200
```


### Select Specific Columns

```
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

```
INSERT INTO
  table1 (id, column1, column2)
VALUES
  ('_id_', '_column1_', '_column2_')
```


### Update

```
UPDATE table1 SET id = '', column1 = '', column2 = ''
WHERE id = ''
AND column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  id = ''
  AND column1 = ''
  AND column2 = ''
```


## mongodb

### Select All Columns

```
db.collection('table1')
  .find()
  .limit(200)
  .toArray();
```


### Select Specific Columns

```
db.collection('table1')
  .find({
    "id": 123,
    "column1": 123,
    "column2": 123
  })
  .limit(200)
  .toArray();
```


### Insert

```
db.collection('table1')
  .insertMany([{
    "id": 123,
    "column1": 123,
    "column2": 123
  }]);
```


### Update

```
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

```
db.collection('table1')
  .deleteMany({
    "id": 123,
    "column1": 123,
    "column2": 123
  });
```


### Create Collection

```
db.createCollection("table1")
```


### Drop Collection

```
db.collection('table1')
  .drop()
```


## redis

### Set Value

```
db.set("key", "value123")
```


### Get Value by Key

```
db.get("key")
```


### Scan for keys

```
db.keys("*")
```


### Hashset > Set Value

```
db.hSet("hash_key1", "field1", "value1")
```


### Hashset > Get Value By Key

```
db.hGetAll("hash_key1")
```


### Hashset > Values

```
db.hVals("hash_key1")
```


### Hashset > Check if key exists

```
db.hExists("hash_key1", "field1")
```


### List > Get Items

```
db.lRange("list_key1", 0, -1)
```


### List > Push item to the front

```
db.lPush("list_key1", "value")
```


### List > Push item to the back

```
db.rPush("list_key1", "value")
```


### List > Delete item from the front

```
db.lPop("list_key1")
```


### List > Delete item from the back

```
db.rPop("list_key1")
```


### Set > Get Items

```
db.sMembers("set_key1")
```


### Set > Add Item

```
db.sAdd("set_key1", "value1")
```


### Set > Is a member of set

```
db.sIsMember("set_key1", "value1")
```


### Set > Total Size

```
db.sCard("set_key1")
```


### Set > Remove last item

```
db.sPop("set_key1")
```


### Sorted Set > Get Items

```
db.zRange("sorted_set_key1", 0, -1)
```


### Sorted Set > Add Item

```
db.zAdd("sorted_set_key1", [{
  score: 1,
  value: "some_value"
}])
```


### Publish a message

```
db.publish("pubsub_channel_key1", "some_message")
```

