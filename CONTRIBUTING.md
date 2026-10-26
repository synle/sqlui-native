# Contributing / Dev Guide

Read [DEV.md](DEV.md) for current commands, packaging, and check procedures. Read [ARCHITECTURE.md](ARCHITECTURE.md) for runtime flows and [AGENTS.md](AGENTS.md) for repository rules.

This guide covers database fixtures, adapter development, and dialect-specific runbooks.

## Bootstrap script for connections

### Requirement

- NODE_VERSION: 24 (use `fnm` to switch: `fnm use 24`)
- npm (bundled with Node)
- Docker (for integration tests)

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
    "name": "Local PostgreSQL"
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
    "connection": "cassandra://cassandra:cassandra@127.0.0.1:9043",
    "name": "Local Cassandra V2"
  },
  {
    "_type": "connection",
    "id": "connection.1643837396621.9385585085281324",
    "connection": "cassandra://cassandra:cassandra@127.0.0.1:9042",
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
  },
  {
    "_type": "connection",
    "id": "connection.1700000000000.1234567890123456",
    "connection": "sfdc://{\"username\":\"you@yourcompany.dev\",\"password\":\"your_password\",\"securityToken\":\"your_token\",\"loginUrl\":\"login.salesforce.com\"}",
    "name": "Salesforce Developer Org"
  },
  {
    "_type": "connection",
    "id": "connection.1711500000000.1234567890123456",
    "connection": "rest://{\"HOST\":\"https://httpbin.org\"}",
    "name": "httpbin REST API",
    "managedMetadata": {
      "databases": [{ "name": "Folder 1" }],
      "tables": [
        {
          "name": "GET Request",
          "databaseId": "Folder 1",
          "props": { "query": "curl '{{HOST}}/get'" }
        },
        {
          "name": "POST JSON",
          "databaseId": "Folder 1",
          "props": {
            "query": "curl -X POST '{{HOST}}/post' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"key\": \"value\"}'"
          }
        },
        {
          "name": "File Upload",
          "databaseId": "Folder 1",
          "props": {
            "query": "curl -X POST '{{HOST}}/post' \\\n  -F 'file=@/path/to/file' \\\n  -F 'description=my upload'"
          }
        }
      ]
    }
  },
  {
    "_type": "connection",
    "id": "connection.1720000000000.1234567890123456",
    "connection": "graphql://{\"ENDPOINT\":\"https://countries.trevorblades.com/graphql\",\"variables\":[]}",
    "name": "Countries GraphQL API",
    "managedMetadata": {
      "databases": [{ "name": "Queries" }],
      "tables": [
        {
          "name": "List Continents",
          "databaseId": "Queries",
          "props": { "query": "{\n  continents {\n    code\n    name\n  }\n}" }
        },
        {
          "name": "Get Country",
          "databaseId": "Queries",
          "props": {
            "query": "query GetCountry($code: ID!) {\n  country(code: $code) {\n    name\n    capital\n    currency\n    languages {\n      name\n    }\n  }\n}\n\n### Variables\n{\"code\": \"US\"}"
          }
        },
        {
          "name": "List Languages",
          "databaseId": "Queries",
          "props": {
            "query": "{\n  languages {\n    code\n    name\n    native\n  }\n}"
          }
        }
      ]
    }
  }
]
```

> **Import behavior (upsert):** When importing connections, queries, or bookmarks, if an item with the same `id` already exists, it will be **updated** (overwritten) rather than duplicated. Items without a matching `id` are created as new entries. For REST API connections with `managedMetadata`, existing folders and requests are always replaced (deleted and recreated) on import.

The import JSON also supports bookmarks with `_type: "bookmark"`:

```json
[
  {
    "_type": "bookmark",
    "id": "bookmarks.1774045514367.1978295883505956",
    "name": "Query 3/11/2026, 7:11:44 PM - 3/20/2026, 3:25:13 PM",
    "data": {
      "id": "queryId.1773281504922.3058967618941833",
      "name": "Query 3/11/2026, 7:11:44 PM",
      "sql": "select * from test"
    }
  }
]
```

### Debugging

- **React Query Devtools:** Press `Ctrl+Shift+Alt+D` (Windows/Linux) or `Cmd+Shift+Option+D` (Mac) to toggle React Query Devtools in any build (including packaged/production builds). Useful for inspecting query cache, stale states, and in-flight requests.

### VS Code Setup

The repo includes `.vscode/launch.json` and `.vscode/tasks.json` with pre-configured debug profiles:

| Launch Config                        | What it does                                                      |
| ------------------------------------ | ----------------------------------------------------------------- |
| **Debug Server**                     | Runs `npm run start-server` with Node debugger attached           |
| **Debug Webapp (Chrome)**            | Opens Chrome at `http://localhost:3000` with devtools debugging   |
| **Debug Tauri (Server + Webapp)**    | Runs `npm start` (Tauri dev mode) with Node debugger attached     |
| **Debug Dev Mode (Server + Webapp)** | Compound: launches both Server and Webapp together (browser mode) |

**Typical workflow:**

1. Use **Debug Dev Mode (Server + Webapp)** for browser-based development with breakpoints in both frontend and backend.
2. Use **Debug Tauri (Server + Webapp)** to test the full Tauri desktop app with Node debugging.

**Tasks** (`Cmd+Shift+B` / `Ctrl+Shift+B`):

- `build` — Build frontend + server
- `build-server` — Build server only
- `build:tauri` — Full Tauri build (frontend + sidecar + Node binary)
- `typecheck` — Run TypeScript type check (errors appear in VS Code Problems panel)

### How to run locally?

```bash
npm install

npm start       # Tauri dev mode
npm run dev     # Browser mode — http://localhost:3000
```

### Tauri Sidecar Lifecycle

See [ARCHITECTURE.md](ARCHITECTURE.md#packaged-desktop) for bundled Node selection, dynamic-port discovery, the startup deadline, and parent-death shutdown.

### To package

Run from the repository root:

```bash
npm run dist
```

Tauri's before-build hook prepares the frontend, sidecar, resources, and bundled Node runtime. Do not install dependencies inside `build/`; see [DEV.md](DEV.md#build-and-package).

### Where is the config / data stored on local machine?

Desktop storage defaults to `~/.sqlui-native/`; portal storage defaults to `~/.sqlui-portal/`. `SQLUI_HOME_DIR` and portal CLI options can override these locations.

The directory resolves lazily on first storage use and is then cached. See [ARCHITECTURE.md](ARCHITECTURE.md#portal) for precedence and [DEV.md](DEV.md#data-and-process-safety) before manual testing.

## Sample Databases

All database engines are defined in [`docker-compose.yml`](docker-compose.yml). Refer to [this repo for the SQL dumps](https://github.com/synle/sqlui-core).

```bash
# Start all containers
docker compose up -d

# Stop and remove all containers
docker compose down

# Notes: use host.docker.internal instead of 127.0.0.1 if facing network error in Windows.
```

### Connecting to individual databases

```bash
# MySQL
docker run -it --rm mysql mysql -uroot -ppassword123! -h 127.0.0.1

# MariaDB
docker exec -it sqlui_mariadb mariadb -uroot -p'password123!'

# Cassandra (v4 / v2)
docker exec -it sqlui_cassandra_v4 cqlsh -u cassandra -p cassandra
docker exec -it sqlui_cassandra_v2 cqlsh -u cassandra -p cassandra
```

### Health checks

```bash
docker exec sqlui_mysql mysqladmin ping -uroot -p'password123!' --silent
docker exec sqlui_postgres pg_isready -U postgres
docker exec sqlui_cassandra_v4 cqlsh -e "DESCRIBE KEYSPACES"
docker exec sqlui_redis redis-cli ping
```

## Integration Tests

Integration tests run against real database engines via Docker. They are separated from unit tests and use the `*.integration.spec.ts` naming convention.

### Running integration tests locally

```bash
# 1. Start all database containers
docker compose up -d

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
docker compose down
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
- `src/common/adapters/AzureTableStorageAdapter/aztable.integration.spec.ts` (requires `TEST_AZ_TABLE_STORAGE_CONNECTION`)
- `src/common/adapters/AzureCosmosDataAdapter/cosmosdb.integration.spec.ts` (requires `TEST_AZ_COSMOSDB_CONNECTION`)
- `src/common/adapters/SalesforceDataAdapter/sfdc.integration.spec.ts` (requires `TEST_SFDC_CONNECTION`)

Each test covers: authenticate, create test data, getTables, getColumns, execute queries, cleanup.

Cloud-based adapters (Azure Table Storage, Azure CosmosDB, Salesforce) don't use Docker — they connect to real cloud services. Their integration tests require connection strings via environment variables and auto-skip when the env var is not set:

| Env Variable                       | Adapter             |
| ---------------------------------- | ------------------- |
| `TEST_AZ_TABLE_STORAGE_CONNECTION` | Azure Table Storage |
| `TEST_AZ_COSMOSDB_CONNECTION`      | Azure CosmosDB      |
| `TEST_SFDC_CONNECTION`             | Salesforce          |

To run these locally, export the env var before running tests:

```bash
export TEST_SFDC_CONNECTION='sfdc://{"username":"...","password":"...","securityToken":"..."}'
npm run test-integration
```

In CI, these are mapped from GitHub secrets in `.github/workflows/integration-test.yml`. To add or update a secret: GitHub repo > Settings > Secrets and variables > Actions > New repository secret.

Integration tests are excluded from `npm run test-ci` and only run via `npm run test-integration`.

## Code Coverage

JS/TS and Rust have separate CI coverage gates. Keep numeric floors in their configuration, not duplicated in documentation; never lower floors without an explicit reason.

See [DEV.md](DEV.md#coverage-ownership) for config/workflow ownership, report locations, platform limits, and the existing JS/TS reporting-baseline mismatch.

For a local JS/TS coverage run:

```bash
npx vitest run --coverage.enabled
```

The configured reporters produce text, `coverage/coverage-summary.json`, and JSON coverage data; they do not currently include an HTML reporter.

## Adding new adapters?

Use the template in [src/common/adapters/\_SampleDataAdapter\_](https://github.com/synle/sqlui-native/tree/main/src/common/adapters/_SampleDataAdapter_) as your starting point. Also see this [Sample PR (Adding Support For Azure Table)](https://github.com/synle/sqlui-native/pull/321/files) for a real-world example.

The template files use placeholder names that you need to replace with your actual values:

| Placeholder in template          | What to replace with                                    | Example                        |
| -------------------------------- | ------------------------------------------------------- | ------------------------------ |
| `SampleDataAdapter` (class name) | PascalCase adapter class name                           | `MyDbDataAdapter`              |
| `AdapterClient` (type alias)     | Client type from your database driver                   | `Client` (from `my-db-driver`) |
| `your_dialect_name` (string)     | Lowercase dialect identifier used in connection strings | `mydb`                         |

### Local structured-text file adapter

`src/common/adapters/FileDataAdapter/` provides read-only connections to local JSON, JSONC, YAML, TOML, and XML files. Add schemes to `FILE_DATA_DIALECTS`, parser dispatch, adapter routing, and `SqluiCore.Dialect` together. Parser behavior belongs in `parsers.spec.ts`; query grammar belongs in `queryParser.spec.ts`; adapter and routing behavior belongs in their co-located specs. `DataScriptFactory.spec.ts` regenerates `guides.md`.

Connections use an absolute path after the format scheme, such as `json:///absolute/path/package.json` or `yml:///absolute/path/build.yaml`. The backend parser dependencies are `jsonc-parser`, `yaml`, `@iarna/toml`, and `fast-xml-parser`. Keep these imports in backend-only adapter modules; browser-reachable modules must remain free of Node APIs and parser I/O.

File queries use a restricted JavaScript-like grammar, not arbitrary JavaScript execution. `res_json` refers to the parsed document, assignments replace that value, and `display(res_json)` returns the result. The table-level **Select JSON** action supplies `display(res_json);`. Supported expressions include safe property/index access, comparisons, boolean/arithmetic operators, and `filter`, `find`, `map`, `slice`, and `includes` calls. The original file text is returned separately from formatted JSON output.

Reads are limited to 10 MiB and remain read-only. Desktop and standalone servers bind to loopback. The portal enables local-file reads only for loopback binds; network-bound portal mode must fail closed. Preserve `configureLocalFileAccess()` checks in `src/common/adapters/FileDataAdapter/localAccess.ts`, `src/sqlui-server/index.ts`, and `src/sqlui-server/portal.ts`.

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

| Method                          | Purpose                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `getConnection()`               | Create and return a connected client instance                                                                                 |
| `closeConnection(client)`       | Disconnect and clean up the client                                                                                            |
| `authenticate()`                | Quick, lightweight check that the connection is valid and the server is reachable — no extra work beyond testing connectivity |
| `getDatabases()`                | Return list of databases/keyspaces/namespaces                                                                                 |
| `getTables(database)`           | Return list of tables/collections in a database                                                                               |
| `getColumns(table, database)`   | Return column metadata (name, type, primaryKey, etc.)                                                                         |
| `execute(sql, database, table)` | Execute a user query and return results                                                                                       |

**`src/common/adapters/MyDbDataAdapter/scripts.ts`** -- Script generators

This file defines pre-built query templates shown in the UI dropdowns and code snippets for the "Export as Code" feature. You must:

- Set `dialects = ['mydb']` to match your dialect from Step 1.
- Implement script generator functions (e.g., `getSelectAllColumns`, `getCreateDatabase`).
- Wire them into `getTableScripts()` and `getDatabaseScripts()`.
- Provide a sample connection string in `getSampleConnectionString()`.
- If your adapter uses a non-URL connection format, override `getConnectionStringFormat()` to return `"json"` (see below).
- Optionally implement `getCodeSnippet()` for JavaScript, Python, and Java exports.

> **Connection string formats:** All connection strings are prefixed with a dialect scheme (`dialect://...`). The format after the scheme depends on the adapter:
>
> - **URL** (default) — Standard URI: `dialect://user:pass@host:port` (relational databases, Cassandra, MongoDB, Redis)
> - **JSON** — JSON object: `sfdc://{"username":"...","password":"..."}` (SFDC). Override `getConnectionStringFormat()` to return `"json"` in your scripts class.
> - **Microsoft-style** — Semicolon-delimited key=value pairs: `aztable://DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...` (Azure Table Storage, CosmosDB)

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

Add a PNG icon to your adapter directory at `src/common/adapters/MyDbDataAdapter/mydb.png`, then import it in your `scripts.ts` and return it from `getDialectIcon()`:

```ts
import mydbIcon from "src/common/adapters/MyDbDataAdapter/mydb.png";

// inside ConcreteDataScripts class:
getDialectIcon() {
  return mydbIcon;
}
```

#### Step 7: Add script spec tests

Open `src/common/adapters/DataScriptFactory.spec.ts` and add your dialect to the test cases so that table/database action scripts are snapshot-tested.

#### Step 8: Verify

```bash
npm run lint                                # check for lint errors (must have 0 errors)
npm run typecheck                           # TypeScript type check (must have 0 errors)
npm run test-ci                             # run unit tests (all tests must pass)
npx vitest run --coverage.enabled           # confirm coverage stays above the thresholds in vitest.config.ts
npm run format                              # oxfmt formatting (always run LAST)
npm start                                   # test in Tauri dev mode -- try adding a connection with your dialect
```

## Sample runbooks

### REST API

```bash
rest://{"HOST":"https://httpbin.org","variables":[{"key":"ACCESS_TOKEN","value":"sample-access-token","enabled":true}]}

# Simple GET
curl '{{HOST}}/get'

# GET with auth
curl '{{HOST}}/bearer' \
  -H 'Authorization: Bearer {{ACCESS_TOKEN}}'

# POST JSON
curl -X POST '{{HOST}}/post' \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}'

# POST form-urlencoded
curl -X POST '{{HOST}}/post' \
  -d 'field1=value1&field2=value2'

# File upload (multipart form data)
curl -X POST '{{HOST}}/post' \
  -F 'file=@/path/to/file' \
  -F 'description=my upload'

# Request with timeout and proxy
curl --max-time 30 --connect-timeout 5 '{{HOST}}/get'
curl -x 'http://proxy:8080' '{{HOST}}/get'

# fetch() syntax (auto-detected)
fetch("{{HOST}}/get", {
  "headers": { "accept": "application/json" },
  "method": "GET"
});
```

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

### Salesforce (SFDC)

Connection string format, OAuth2 flows, and sample queries live in the [README](README.md#salesforce-sfdc-limitations). Dev-specific notes:

#### Free Developer Org

1. Sign up at <https://developer.salesforce.com/signup> — username must be email-format (e.g. `you@yourcompany.dev`, need not be a real inbox).
2. Verify via email and set the password.
3. Security token: **Settings > My Personal Information > Reset My Security Token** (emailed to you). Omit it if your IP is whitelisted or the option is missing.

A Trailhead Playground (<https://trailhead.salesforce.com>) also works.

#### Enabling SOAP API Login

Newer orgs (Spring '25+) disable SOAP API login by default; sqlui-native authenticates over SOAP:

1. **Setup** > Quick Find > **Profiles** > your profile (e.g. System Administrator)
2. Edit > check **SOAP API Login Allowed** (or **API Enabled**) > Save
3. Not there? Check your assigned **Permission Set**, then **Session Settings**.

Alternative: create a Connected App (**App Manager** > New Connected App, enable OAuth, scope `Full access`) and put its `clientId`/`clientSecret` in the connection string instead of username/password/token.

The Lightning UI URL (`orgfarm-xxx.develop.lightning.force.com`) is not the API login URL — use `login.salesforce.com` (prod/dev) or `test.salesforce.com` (sandbox).

#### Troubleshooting

- `INVALID_LOGIN` — usually a missing security token
- `LOGIN_MUST_USE_SECURITY_TOKEN` — IP not whitelisted; token required
- Correct credentials but `INVALID_LOGIN` — use the Salesforce username, not your personal email
- Timeout — wrong loginUrl
- JSON parse error — string must start with `sfdc://` followed by valid JSON

#### Concept Mapping

| SQL Concept | Salesforce Concept | Example                |
| ----------- | ------------------ | ---------------------- |
| Database    | Org                | One org per connection |
| Table       | SObject            | Account, Contact, Lead |
| Column      | Field              | Name, Email, Phone     |
| Row         | Record             | A single Account       |
| Primary Key | Id                 | 18-character record ID |

#### Query Modes

| Prefix   | Mode            | Use for                                                                                                                                   |
| -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `SELECT` | SOQL (read)     | Single-object SQL-like query: `SELECT Id, Name FROM Account LIMIT 10`                                                                     |
| `FIND`   | SOSL (search)   | Full-text search across objects: `FIND {Acme} IN ALL FIELDS RETURNING Account(Id, Name)`                                                  |
| `conn.`  | JS API (mutate) | `conn.sobject("Account").create(...)`, `.update()`, `.destroy()`, `.upsert(...)`, `.describe()`, plus `conn.identity()` / `conn.limits()` |

SOQL returns flat records from a known object; SOSL returns results grouped per object with a slight search-index delay.

## CI / CD Notes

Self hosted runners

### Windows

```bash
Set-ExecutionPolicy RemoteSigned
```
