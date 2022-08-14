# Contributing / Dev Guide

## Bootstrap script for connections

### Requirement

- Node 14+
- [Yarn v1 (tested on 1.22.19)](https://classic.yarnpkg.com/en/docs/install#windows-stable)

### Starting guide

- Refer to this Linkedin POST for the basic overview of this project.

### Sample Import Files

```
[
  {
    "_type": "connection",
    "id": "connection.1643485467072.6333713976068809",
    "connection": "mysql://root:password@localhost:3306",
    "name": "local mysql"
  },
  {
    "_type": "connection",
    "id": "connection.1643485479951.8848237338571023",
    "connection": "mariadb://root:password@localhost:33061",
    "name": "local mariadb"
  },
  {
    "_type": "connection",
    "id": "connection.1643485495810.296972129680364",
    "connection": "mssql://sa:password123!@localhost:1433",
    "name": "local sql server"
  },
  {
    "_type": "connection",
    "id": "connection.1643485516220.4798705129674932",
    "connection": "postgres://postgres:password@localhost:5432",
    "name": "local postgres"
  },
  {
    "_type": "connection",
    "id": "connection.1643485607366.2475344250499598",
    "connection": "sqlite://test.sqlite",
    "name": "local sqlite"
  },
  {
    "_type": "connection",
    "id": "connection.1643921772969.1005383449983459",
    "connection": "cassandra://localhost:9043",
    "name": "local cassandra v2"
  },
  {
    "_type": "connection",
    "id": "connection.1643837396621.9385585085281324",
    "connection": "cassandra://localhost:9042",
    "name": "local cassandra v4"
  },
  {
    "_type": "connection",
    "id": "connection.1644343163858.95939920823759",
    "connection": "mongodb://localhost:27017",
    "name": "local mongodb"
  },
  {
    "_type": "connection",
    "id": "connection.1644456516996.9387746947534656",
    "connection": "redis://localhost:6379",
    "name": "local redis"
  }
]
```

### How to run locally?

#### In an electron container

```
yarn
yarn start
```

#### In a mocked server container

Run this and test it in the browser

```
yarn
yarn dev
# then open a browser with URL
# http://localhost:3000
```

### To package

```
yarn build
cd build
yarn
yarn dist
```

### Where is the config / data stored on local machine?

```
# Windows
C:\Users\some_username\AppData\Roaming\sqlui-native

# Mac
cd ~/Library/Application\ Support/sqlui-native/
```

## Sample Databases

Docker can be used to spin off these database engines. Refer to [this repo for the SQL dumps](https://github.com/synle/sqlui-core).

```
# MySQL (https://hub.docker.com/_/mysql)
docker run --name sqlui_mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -d mysql

  # Use this to connect to mysql with the docker image
  docker run -it --rm mysql mysql -h127.0.0.1 -uroot -p

# MariaDB (https://hub.docker.com/_/mariadb)
docker run --detach --name sqlui_mariadb -p 33061:3306 -e MARIADB_ROOT_PASSWORD=password mariadb:latest

# MSSQL (https://hub.docker.com/_/microsoft-mssql-server)
  # for Windows WSL and Intel Based Macs
  docker run --name sqlui_mssql -e "ACCEPT_EULA=Y" -e 'SA_PASSWORD=password123!' -p 1433:1433 -d mcr.microsoft.com/mssql/server:2019-latest

  # for m1 Macs (https://docs.microsoft.com/en-us/answers/questions/654108/azure-sql-edge-on-mac-m1-using-docker.html)
  docker run --name sqlui_mssql_m1 -e "ACCEPT_EULA=Y" -e 'SA_PASSWORD=password123!' -p 1433:1433 -d mcr.microsoft.com/azure-sql-edge

# postgres (https://hub.docker.com/_/postgres)
docker run --name sqlui_postgres -p 5432:5432 -e POSTGRES_PASSWORD=password -d postgres

# Cassandra
  # v4 (latest)
  docker run --name sqlui_cassandra_v4 -p 9042:9042 -d cassandra:4.0.1

  # v2 (legacy) - note that here we expose it in the same machine on port 9043
  docker run --name sqlui_cassandra_v2 -p 9043:9042 -d cassandra:2.2.19

  # use qlsh - use the above image name for cqlsh
  docker exec -it sqlui_cassandra_v4 cqlsh
  docker exec -it sqlui_cassandra_v2 cqlsh

# mongodb
docker run --name sqlui_mongodb -p 27017:27017 -d mongo

# redis
docker run --name sqlui_redis -p 6379:6379 -d redis

# cockroachdb
  # https://www.cockroachlabs.com/docs/stable/install-cockroachdb-mac.html
  cockroach demo
```

## Adding new adapters?

Refer to this folder for files related to adding a new adapter.

- [Adapter Core Files](https://github.com/synle/sqlui-native/tree/main/src/common/adapters/_SampleDataAdapter_)
- [Sample PR (Adding Support For Azure Table)](https://github.com/synle/sqlui-native/pull/321/files)

Overall the process requires that you do:

- Create a new dialect value in the typings `typings/index.ts`
- Create a new adapter (refer to this folder https://github.com/synle/sqlui-native/tree/main/src/common/adapters/_SampleDataAdapter_)
- Hook it up with the Data Adapter Factory.
- Hook it up with the Data Script Factory.
- Create the icon for the new dialect. File is located in `public/assets` and must match the dialect name and ended in `png`.
- Add the script spec into the Data Script Factory Test.

## Sample runbooks

### Relational Database

```
mysql://root:password@localhost:3306

ALTER TABLE artists ADD COLUMN email varchar(200);

INSERT INTO
  artists (Name, Email)
VALUES
  ('Sy Le', 'syle@test_email.com')


SELECT
  *
FROM
  artists
WHERE email LIKE 'syle@test_email.com'
LIMIT
  10
```

### Cassandra

```
-- Create a artists music_stores
CREATE KEYSPACE music_stores
WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3};

CREATE TABLE artists(
  artist_id int PRIMARY KEY,
  name text
)
```

## CI / CD Notes

Self hosted runners

### Windows

```
Set-ExecutionPolicy RemoteSigned
```
