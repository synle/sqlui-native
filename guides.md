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
  column1 = ''
  AND column2 = ''
```


### Select Specific Columns

```
SELECT
  column1,
  column2
FROM
  table1
WHERE
  column1 = ''
  AND column2 = ''
LIMIT
  200
```


### Update

```
UPDATE table1 SET column1 = '', column2 = ''
WHERE column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  column1 = ''
  AND column2 = ''
```


### Create Table

```
CREATE TABLE table1 (column1 NUMBER NOT NULL, column2 VARCHAR(100) NOT NULL)
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
  column1 = ''
  AND column2 = ''
```


### Select Specific Columns

```
SELECT
  column1,
  column2
FROM
  table1
WHERE
  column1 = ''
  AND column2 = ''
LIMIT
  200
```


### Update

```
UPDATE table1 SET column1 = '', column2 = ''
WHERE column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  column1 = ''
  AND column2 = ''
```


### Create Table

```
CREATE TABLE table1 (column1 NUMBER NOT NULL, column2 VARCHAR(100) NOT NULL)
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
  column1 = ''
  AND column2 = ''
```


### Select Specific Columns

```
SELECT
  TOP 200 column1,
  column2
FROM
  table1
WHERE
  column1 = ''
  AND column2 = ''
```


### Update

```
UPDATE table1 SET column1 = '', column2 = ''
WHERE column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  column1 = ''
  AND column2 = ''
```


### Create Table

```
CREATE TABLE table1 (column1 NUMBER NOT NULL, column2 VARCHAR(100) NOT NULL)
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
  column1 = ''
  AND column2 = ''
```


### Select Specific Columns

```
SELECT
  column1,
  column2
FROM
  table1
WHERE
  column1 = ''
  AND column2 = ''
LIMIT
  200
```


### Update

```
UPDATE table1 SET column1 = '', column2 = ''
WHERE column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  column1 = ''
  AND column2 = ''
```


### Create Table

```
CREATE TABLE table1 (column1 NUMBER NOT NULL, column2 VARCHAR(100) NOT NULL)
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
  column1 = ''
  AND column2 = ''
```


### Select Specific Columns

```
SELECT
  column1,
  column2
FROM
  table1
WHERE
  column1 = ''
  AND column2 = ''
LIMIT
  200
```


### Update

```
UPDATE table1 SET column1 = '', column2 = ''
WHERE column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  column1 = ''
  AND column2 = ''
```


### Create Table

```
CREATE TABLE table1 (column1 NUMBER NOT NULL, column2 VARCHAR(100) NOT NULL)
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
  column1,
  column2
FROM
  table1
WHERE
  column1 = ''
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
UPDATE table1 SET column1 = '', column2 = ''
WHERE column1 = ''
AND column2 = ''
```


### Delete

```
DELETE FROM
  table1
WHERE
  column1 = ''
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
    "column1": 123,
    "column2": 123
  }]);
```


### Update

```
db.collection('table1')
  .update({
    "column1": 123,
    "column2": 123
  }, {
    $set: {
      "column1": 123,
      "column2": 123
    }
  });
```


### Delete

```
db.collection('table1')
  .deleteMany({
    "column1": 123,
    "column2": 123
  });
```


### Create Table

```
db.createCollection("table1")
```


### Drop Table

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
db.hSet("key", "field", "value")
```


### Hashset > Get Value By Key

```
db.hGetAll("key")
```


### Hashset > Values

```
db.hVals("key")
```


### Hashset > Check if key exists

```
db.hExists("key", "field1")
```


### List > Get Items

```
db.lRange("key", 0, -1)
```


### List > Push item to the front

```
db.lPush("key", "value")
```


### List > Push item to the back

```
db.rPush("key", "value")
```


### List > Delete item from the front

```
db.lPop("key")
```


### List > Delete item from the back

```
db.rPop("key")
```


### Set > Get Items

```
db.sMembers("key")
```


### Set > Add Item

```
db.sAdd("key", "value1")
```


### Set > Is a member of set

```
db.sIsMember("key", "value1")
```


### Set > Total Size

```
db.sCard("key")
```


### Set > Remove last item

```
db.sPop("key")
```


### Sorted Set > Get Items

```
db.zRange("key", 0, -1)
```


### Sorted Set > Add Item

```
db.zAdd("key", [{
  score: 1,
  value: "some_value"
}])
```


### Publish a message

```
db.publish("key", "some_message")
```

