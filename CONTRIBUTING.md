# Contributing / Dev Guide

## Bootstrap script for connections

### Requirement

- NODE_VERSION: 20
- npm (bundled with Node)
- Docker (for integration tests)

### Starting guide

- Refer to this Linkedin POST for the basic overview of this project.

### Sample Import Files

Assuming you use the same database in the docker samples below:

```json
[
  {
    "_type": "connection",
    "id": "connection.1643485467072.6333713976068809",
    "connection": "mysql://root:password123!@127.0.0.1:3306",
    "name": "local mysql"
  },
  {
    "_type": "connection",
    "id": "connection.1643485479951.8848237338571023",
    "connection": "mariadb://root:password123!@127.0.0.1:33061",
    "name": "local mariadb"
  },
  {
    "_type": "connection",
    "id": "connection.1643485495810.296972129680364",
    "connection": "mssql://sa:password123!@127.0.0.1:1433",
    "name": "local sql server"
  },
  {
    "_type": "connection",
    "id": "connection.1643485516220.4798705129674932",
    "connection": "postgres://postgres:password123!@127.0.0.1:5432",
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
    "connection": "cassandra://127.0.0.1:9043",
    "name": "local cassandra v2"
  },
  {
    "_type": "connection",
    "id": "connection.1643837396621.9385585085281324",
    "connection": "cassandra://127.0.0.1:9042",
    "name": "local cassandra v4"
  },
  {
    "_type": "connection",
    "id": "connection.1644343163858.95939920823759",
    "connection": "mongodb://127.0.0.1:27017",
    "name": "local mongodb"
  },
  {
    "_type": "connection",
    "id": "connection.1644456516996.9387746947534656",
    "connection": "redis://127.0.0.1:6379",
    "name": "local redis"
  }
]
```

### How to run locally?

#### In an electron container

```bash
npm install
npm start
```

#### In a mocked server container

Run this and test it in the browser

```bash
npm install
npm run dev
# then open a browser with URL
# http://localhost:3000
```

### To package

```bash
npm run build
cd build
npm install
npm run dist
```

### Where is the config / data stored on local machine?

```bash
# Windows
C:\Users\some_username\AppData\Roaming\sqlui-native

# Mac
cd ~/Library/Application\ Support/sqlui-native/
```

## Sample Databases

Docker can be used to spin off these database engines. Refer to [this repo for the SQL dumps](https://github.com/synle/sqlui-core).

### More in depth

```bash
# Notes: use host.docker.internal instead of 127.0.0.1 if facing network error in Windows.

# MySQL (https://hub.docker.com/_/mysql)
docker run --name sqlui_mysql -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD='password123!' mysql

  # Use this to connect to mysql with the docker image
  docker run -it --rm mysql mysql -uroot -ppassword123! -h 127.0.0.1

# MariaDB (https://hub.docker.com/_/mariadb)
docker run --detach --name sqlui_mariadb -p 33061:3306 -e MARIADB_ROOT_PASSWORD='password123!' mariadb:latest

# postgres (https://hub.docker.com/_/postgres)
docker run --name sqlui_postgres -d -p 5432:5432 -e POSTGRES_PASSWORD='password123!' postgres

# Cassandra
  # v4 (latest)
  docker run --name sqlui_cassandra_v4 -d -p 9042:9042 cassandra:4.0.1

  # v2 (legacy) - note that here we expose it in the same machine on port 9043
  docker run --name sqlui_cassandra_v2 -d -p 9043:9042 cassandra:2.2.19

  # use qlsh - use the above image name for cqlsh
  docker exec -it sqlui_cassandra_v4 cqlsh
  docker exec -it sqlui_cassandra_v2 cqlsh

# mongodb
docker run --name sqlui_mongodb -d -p 27017:27017 mongo

# redis
docker run --name sqlui_redis -d -p 6379:6379 redis

# cockroachdb - https://www.cockroachlabs.com/docs/stable/install-cockroachdb-mac.html `cockroach demo` (26257: sql port) (8080: ui port)
docker run --name sqlui_cockroach_demo -d -p 26257:26257 -p 8080:8080 cockroachdb/cockroach:latest start-single-node --insecure

# MSSQL (https://hub.docker.com/_/microsoft-mssql-server): for Windows WSL and Intel Based Macs
docker run --name sqlui_mssql -d -p 1433:1433 -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=password123!" mcr.microsoft.com/mssql/server:2022-latest

# MSSQL (https://hub.docker.com/_/microsoft-mssql-server): for m1 Macs (https://docs.microsoft.com/en-us/answers/questions/654108/azure-sql-edge-on-mac-m1-using-docker.html)
docker run --name sqlui_mssql_m1 -d -e "ACCEPT_EULA=Y" -p 1433:1433 -e SA_PASSWORD='password123!' mcr.microsoft.com

    # Use this to test if the connection is alive
    docker exec sqlui_mysql mysqladmin ping -uroot -p'password123!' --silent
```

## Integration Tests

Integration tests run against real database engines via Docker. They are separated from unit tests and use the `*.integration.spec.ts` naming convention.

### Running integration tests locally

```bash
# 1. Start all database containers
docker run --name sqlui_mysql -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD='password123!' mysql
docker run --name sqlui_mariadb -d -p 33061:3306 -e MARIADB_ROOT_PASSWORD='password123!' mariadb:latest
docker run --name sqlui_postgres -d -p 5432:5432 -e POSTGRES_PASSWORD='password123!' postgres
docker run --name sqlui_cassandra_v4 -d -p 9042:9042 cassandra:4.0.1
docker run --name sqlui_cassandra_v2 -d -p 9043:9042 cassandra:2.2.19
docker run --name sqlui_mongodb -d -p 27017:27017 mongo
docker run --name sqlui_redis -d -p 6379:6379 redis
docker run --name sqlui_cockroach_demo -d -p 26257:26257 cockroachdb/cockroach:latest start-single-node --insecure
docker run --name sqlui_mssql -d -p 1433:1433 -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=password123!" mcr.microsoft.com/mssql/server:2022-latest
# for M Series Macs
# docker run --name sqlui_mssql_m1 -d -e "ACCEPT_EULA=Y" -p 1433:1433 -e SA_PASSWORD='password123!' mcr.microsoft.com

# for M-Series Macs, use this instead of the mssql line above
#/azure-sql-edge

# 2. Wait for containers to be ready (Cassandra takes the longest ~60-90s)
docker exec sqlui_mysql mysqladmin ping -uroot -p'password123!' --silent
docker exec sqlui_postgres pg_isready -U postgres
docker exec sqlui_cassandra_v4 cqlsh -e "DESCRIBE KEYSPACES"
docker exec sqlui_redis redis-cli ping

# 3. Install dependencies
npm install

# 4. Run all integration tests
npm run test-integration

# 5. Run a single adapter test
npx vitest run --config vitest.integration.config.ts src/common/adapters/RelationalDataAdapter/mysql.integration.spec.ts

# 6. Cleanup containers when done
docker rm -f sqlui_mysql sqlui_mariadb sqlui_mssql sqlui_postgres sqlui_cassandra_v4 sqlui_cassandra_v2 sqlui_mongodb sqlui_redis sqlui_cockroach_demo
```

### Running integration tests via GitHub Actions

The integration test workflow is available under `.github/workflows/integration-test.yml`. It is triggered manually via `workflow_dispatch` from the Actions tab on GitHub.

### Test structure

Integration tests live alongside their adapter source code:

- `src/common/adapters/RelationalDataAdapter/mysql.integration.spec.ts`
- `src/common/adapters/RelationalDataAdapter/mariadb.integration.spec.ts`
- `src/common/adapters/RelationalDataAdapter/mssql.integration.spec.ts`
- `src/common/adapters/RelationalDataAdapter/postgres.integration.spec.ts`
- `src/common/adapters/CassandraDataAdapter/cassandra.integration.spec.ts` (v4 + v2)
- `src/common/adapters/MongoDBDataAdapter/mongodb.integration.spec.ts`
- `src/common/adapters/RedisDataAdapter/redis.integration.spec.ts`

Each test covers: authenticate, create test data, getTables, getColumns, execute queries, cleanup.

Integration tests are excluded from `npm run test-ci` and only run via `npm run test-integration`.

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

```sql
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

```sql
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

```bash
Set-ExecutionPolicy RemoteSigned
```
