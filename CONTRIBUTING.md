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
    "name": "Local MySQL"
  },
  {
    "_type": "connection",
    "id": "connection.1643485479951.8848237338571023",
    "connection": "mariadb://root:password123!@127.0.0.1:33061",
    "name": "Local MariaDB"
  },
  {
    "_type": "connection",
    "id": "connection.1643485495810.296972129680364",
    "connection": "mssql://sa:password123!@127.0.0.1:1433",
    "name": "Local Microsoft SQL Server"
  },
  {
    "_type": "connection",
    "id": "connection.1643485516220.4798705129674932",
    "connection": "postgres://postgres:password123!@127.0.0.1:5432",
    "name": "Local PostgresSQL"
  },
  {
    "_type": "connection",
    "id": "connection.1643485607366.2475344250499598",
    "connection": "sqlite://test.sqlite",
    "name": "Local SQLite"
  },
  {
    "_type": "connection",
    "id": "connection.1643921772969.1005383449983459",
    "connection": "cassandra://127.0.0.1:9043",
    "name": "Local Cassandra V2"
  },
  {
    "_type": "connection",
    "id": "connection.1643837396621.9385585085281324",
    "connection": "cassandra://127.0.0.1:9042",
    "name": "Local Cassandra V4"
  },
  {
    "_type": "connection",
    "id": "connection.1644343163858.95939920823759",
    "connection": "mongodb://127.0.0.1:27017",
    "name": "Local MongoDB"
  },
  {
    "_type": "connection",
    "id": "connection.1644456516996.9387746947534656",
    "connection": "redis://127.0.0.1:6379",
    "name": "Local Redis"
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

  # Connect to MariaDB via the running container
  docker exec -it sqlui_mariadb mariadb -uroot -p'password123!'

  # Or connect using a disposable container
  docker run -it --rm mariadb mariadb -uroot -p'password123!' -h host.docker.internal -P 33061

  # Check if MariaDB is ready
  docker exec sqlui_mariadb mariadb-admin ping -uroot -p'password123!' --silent

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

Use the template in [src/common/adapters/\_SampleDataAdapter\_](https://github.com/synle/sqlui-native/tree/main/src/common/adapters/_SampleDataAdapter_) as your starting point. Also see this [Sample PR (Adding Support For Azure Table)](https://github.com/synle/sqlui-native/pull/321/files) for a real-world example.

The template files use placeholder names that you need to replace with your actual values:

| Placeholder in template          | What to replace with                                    | Example                        |
| -------------------------------- | ------------------------------------------------------- | ------------------------------ |
| `SampleDataAdapter` (class name) | PascalCase adapter class name                           | `MyDbDataAdapter`              |
| `AdapterClient` (type alias)     | Client type from your database driver                   | `Client` (from `my-db-driver`) |
| `your_dialect_name` (string)     | Lowercase dialect identifier used in connection strings | `mydb`                         |

### Step-by-step guide

Below we use `MyDb` as an example adapter name and `mydb` as the dialect name. Replace these with your actual values.

#### Step 1: Add the dialect to typings

Open `typings/index.ts` and add your new dialect to the `Dialect` type:

```ts
// In typings/index.ts, find the Dialect type and add your dialect
export type Dialect = 'mysql' | 'mariadb' | ... | 'mydb';
```

#### Step 2: Install your database driver

```bash
npm install your-db-driver
```

#### Step 3: Create the adapter directory

Copy the sample adapter folder and rename it:

```bash
cp -r src/common/adapters/_SampleDataAdapter_ src/common/adapters/MyDbDataAdapter
```

You will have three files to implement:

**`src/common/adapters/MyDbDataAdapter/index.ts`** -- The data adapter class

This class extends `BaseDataAdapter` and implements `IDataAdapter`. You must implement:

| Method                          | Purpose                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| `getConnection()`               | Create and return a connected client instance                     |
| `closeConnection(client)`       | Disconnect and clean up the client                                |
| `authenticate()`                | Verify the connection string is valid and the server is reachable |
| `getDatabases()`                | Return list of databases/keyspaces/namespaces                     |
| `getTables(database)`           | Return list of tables/collections in a database                   |
| `getColumns(table, database)`   | Return column metadata (name, type, primaryKey, etc.)             |
| `execute(sql, database, table)` | Execute a user query and return results                           |

**`src/common/adapters/MyDbDataAdapter/scripts.ts`** -- Script generators

This file defines pre-built query templates shown in the UI dropdowns and code snippets for the "Export as Code" feature. You must:

- Set `dialects = ['mydb']` to match your dialect from Step 1.
- Implement script generator functions (e.g., `getSelectAllColumns`, `getCreateDatabase`).
- Wire them into `getTableScripts()` and `getDatabaseScripts()`.
- Provide a sample connection string in `getSampleConnectionString()`.
- Optionally implement `getCodeSnippet()` for JavaScript, Python, and Java exports.

**`src/common/adapters/MyDbDataAdapter/index.spec.ts`** -- Tests

Uncomment and fill in the test skeleton. At minimum, test `authenticate`, `getDatabases`, `getTables`, `getColumns`, and `execute`.

#### Step 4: Register in DataAdapterFactory

Open `src/common/adapters/DataAdapterFactory.ts` and add your adapter:

```ts
// 1. Add imports at the top
import MyDbDataAdapter from 'src/common/adapters/MyDbDataAdapter/index';
import MyDbDataAdapterScripts from 'src/common/adapters/MyDbDataAdapter/scripts';

// 2. Add an else-if branch inside getDataAdapter()
} else if (MyDbDataAdapterScripts.isDialectSupported(targetDialect)) {
  adapter = new MyDbDataAdapter(connection);
}
```

#### Step 5: Register in DataScriptFactory

Open `src/common/adapters/DataScriptFactory.ts` and add your scripts:

```ts
// 1. Add import at the top
import MyDbDataAdapterScripts from "src/common/adapters/MyDbDataAdapter/scripts";

// 2. Add to the getAllImplementations() array
export function getAllImplementations(): BaseDataScript[] {
  return [...MyDbDataAdapterScripts];
}
```

#### Step 6: Add the dialect icon

Add a PNG icon to `public/assets/mydb.png`. The filename **must** match your dialect name exactly.

#### Step 7: Add script spec tests

Open `src/common/adapters/DataScriptFactory.spec.ts` and add your dialect to the test cases so that table/database action scripts are snapshot-tested.

#### Step 8: Verify

```bash
npm run lint          # check for lint errors
npm run test-ci       # run unit tests
npm start             # test in Electron -- try adding a connection with your dialect
```

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
