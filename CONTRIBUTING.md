# Contributing / Dev Guide

## Bootstrap script for connections

### Requirement

- NODE_VERSION: 24 (use `fnm` to switch: `fnm use 24`)
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

#### In Tauri dev mode

```bash
npm install
npm start
```

#### In browser mode (dev server)

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
npm run lint          # check for lint errors (must have 0 errors)
npm run typecheck     # TypeScript type check (must have 0 errors)
npm run test-ci       # run unit tests (all tests must pass)
npm run format        # Prettier formatting (always run LAST)
npm start             # test in Tauri dev mode -- try adding a connection with your dialect
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

#### Creating a Free Salesforce Developer Org

1. Go to [https://developer.salesforce.com/signup](https://developer.salesforce.com/signup).
2. Fill in the form with your name, email, and a username (must be in email format, e.g. `you@yourcompany.dev` -- it does not need to be a real email).
3. Check your email for the verification link and set your password.
4. You now have a free Developer Edition org with full API access. This org does not expire (just log in occasionally to keep it active).

You can also use a **Trailhead Playground** (free orgs from [trailhead.salesforce.com](https://trailhead.salesforce.com)) -- these also have full API access.

#### Getting Your Security Token

Salesforce requires a security token for API access (unless your IP is whitelisted):

1. Log in to your Salesforce org at [https://login.salesforce.com](https://login.salesforce.com).
2. Click your avatar (top right) > **Settings**.
3. In the left sidebar, go to **My Personal Information** > **Reset My Security Token**.
4. Click **Reset Security Token**. A new token will be emailed to you.

If you don't see the "Reset My Security Token" option, your org may have IP restrictions disabled, and you can leave the security token empty.

#### Enabling SOAP API Login

Newer Salesforce orgs (Spring '25+) have SOAP API login disabled by default. sqlui-native uses SOAP API to authenticate, so you must enable it:

1. Log in to your Salesforce org and go to **Setup** (gear icon > Setup).
2. In the **Quick Find** box, search for **"Profiles"**.
3. Click on your user's profile (e.g., **"System Administrator"**).
4. Click **Edit** (or for Enhanced Profile view, look under **Administrative Permissions**).
5. Check **"SOAP API Login Allowed"** (or **"API Enabled"** if that's what you see).
6. Click **Save**.

If you can't find the setting under Profiles, try:

- Search **"Permission Sets"** in Setup, find your assigned permission set, and enable **"SOAP API Login Allowed"** there.
- Search **"Session Settings"** and check if there's an API login restriction.

**Alternative: Use a Connected App (OAuth2)**

If you cannot enable SOAP API login, you can create a Connected App and use OAuth2 instead:

1. In Setup, search for **"App Manager"** > **New Connected App**.
2. Fill in the basic info (name, email).
3. Under **API (Enable OAuth Settings)**, check **Enable OAuth Settings**.
4. Set callback URL to `https://login.salesforce.com/services/oauth2/callback`.
5. Add **"Full access (full)"** to Selected OAuth Scopes.
6. Save and wait a few minutes for it to activate.
7. Copy the **Consumer Key** (Client ID) and **Consumer Secret** (Client Secret).
8. Add them to your connection string. Two options:

**With username/password (OAuth2 Username-Password flow):**

```
sfdc://{"username":"you@yourcompany.dev","password":"your_password","securityToken":"your_token","clientId":"your_consumer_key","clientSecret":"your_consumer_secret"}
```

**Without username/password (OAuth2 Client Credentials flow):**

```
sfdc://{"clientId":"your_consumer_key","clientSecret":"your_consumer_secret","loginUrl":"your-org.my.salesforce.com"}
```

The Client Credentials flow is useful for service-to-service integrations where no user credentials are available. The adapter uses Node's native `https` module for the OAuth2 token request (instead of jsforce's internal HTTP client, which hangs in bundled sidecar builds). Sessions are automatically refreshed via `withAutoRefresh()` when `INVALID_SESSION_ID` or `Session expired` errors are detected.

#### Connection String Format

The connection string uses JSON to avoid URL encoding issues with special characters in passwords:

```
sfdc://{"username":"you@yourcompany.dev","password":"your_password","securityToken":"your_token","loginUrl":"login.salesforce.com"}
```

- **username** -- Your Salesforce username (e.g. `you@yourcompany.dev`)
- **password** -- Your Salesforce password (no encoding needed, supports any special characters)
- **securityToken** -- The token from the email (can be omitted if IP whitelisted)
- **loginUrl** -- Defaults to `login.salesforce.com`. Use `test.salesforce.com` for sandbox orgs

Example with real credentials:

```
sfdc://{"username":"you@yourcompany.dev","password":"MyP@ss!123","securityToken":"ABCDEF","loginUrl":"login.salesforce.com"}
```

Without security token:

```
sfdc://{"username":"you@yourcompany.dev","password":"MyP@ss!123"}
```

**Note:** The Login URL from the Salesforce Lightning UI (e.g. `orgfarm-xxx.develop.lightning.force.com`) is **not** the API login URL. Always use `login.salesforce.com` for production/developer orgs or `test.salesforce.com` for sandbox orgs.

#### Connection Form

When using the UI connection helper, select `sfdc` as the scheme and paste the JSON into the connection string field:

```json
{
  "username": "you@yourcompany.dev",
  "password": "your_password",
  "securityToken": "your_token",
  "loginUrl": "login.salesforce.com"
}
```

The `loginUrl` field defaults to `login.salesforce.com` if omitted.

#### Troubleshooting Connection Issues

- **"INVALID_LOGIN" error** -- Most commonly caused by a missing security token. Reset it and add it to the `securityToken` field.
- **"LOGIN_MUST_USE_SECURITY_TOKEN" error** -- Your IP is not whitelisted. You must provide a security token.
- **"INVALID_LOGIN" with correct credentials** -- Check that your username is the Salesforce username (email format), not your actual email address. These can be different.
- **Timeout errors** -- Your org's login URL may be wrong. Verify you're using `login.salesforce.com` (not a custom domain).
- **JSON parse error** -- Make sure your connection string starts with `sfdc://` followed by valid JSON. Special characters in passwords are fine inside JSON strings.

#### Concept Mapping

| SQL Concept | Salesforce Concept | Example                           |
| ----------- | ------------------ | --------------------------------- |
| Database    | Org                | One org per connection            |
| Table       | SObject            | Account, Contact, Lead, etc.      |
| Column      | Field              | Name, Email, Phone, etc.          |
| Row         | Record             | A single Account or Contact       |
| Primary Key | Id                 | 18-character Salesforce record ID |

#### Query Modes

The Salesforce adapter supports three query modes in the editor:

**1. SOQL (Salesforce Object Query Language)** -- for reading data

Queries starting with `SELECT` are executed as SOQL:

```sql
SELECT Id, Name FROM Account LIMIT 10
```

**2. SOSL (Salesforce Object Search Language)** -- for searching across objects

Queries starting with `FIND` are executed as SOSL:

```sql
FIND {keyword} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name, Email) LIMIT 20
```

**3. JS API (conn.sobject)** -- for mutations and metadata

Queries containing `conn.` are executed as JavaScript for create, update, delete, upsert, and describe operations:

```js
// Insert
conn.sobject("Account").create({ Name: "Acme Corp", Industry: "Technology" });

// Update (requires Id)
conn.sobject("Account").update({ Id: "001xxx", Name: "Updated Name" });

// Delete
conn.sobject("Account").destroy("001xxx");

// Upsert (using external ID field)
conn.sobject("Account").upsert({ External_Id__c: "EXT-001", Name: "Upserted Account" }, "External_Id__c");

// Describe object metadata
conn.sobject("Account").describe();

// Org identity
conn.identity();

// Org API limits
conn.limits();
```

#### SOQL vs SOSL

**SOQL (Salesforce Object Query Language)**

- Queries a **single object** (with optional related objects via relationships)
- Similar to SQL `SELECT` -- you specify fields, object, and filters
- Returns records from a **known object**
- Example: `SELECT Name, Email FROM Contact WHERE LastName = 'Smith'`

**SOSL (Salesforce Object Search Language)**

- Searches across **multiple objects simultaneously**
- Uses a full-text search index (like a search engine)
- Returns records grouped by object type
- Example: `FIND {Smith} IN ALL FIELDS RETURNING Contact(Name, Email), Account(Name)`

**Key Differences**

|                 | SOQL                                 | SOSL                                             |
| --------------- | ------------------------------------ | ------------------------------------------------ |
| **Scope**       | Single object (+ relationships)      | Multiple objects at once                         |
| **Search type** | Field-level filtering (`WHERE`)      | Full-text search (`FIND`)                        |
| **Use when**    | You know which object/field to query | You need to search across objects                |
| **Results**     | Flat list of records                 | List of lists (grouped by object)                |
| **DML**         | Can be used in DML context           | Read-only                                        |
| **Index**       | Uses database indexes                | Uses search index (slight delay for new records) |
| **Wildcards**   | `LIKE '%value%'`                     | `FIND {value*}` (more flexible)                  |

**When to use which**

- **SOQL**: Retrieving specific records from a known object with precise filters (e.g., "get all Contacts where Status = Active")
- **SOSL**: Searching for a term across multiple objects (e.g., "find 'Acme' in Contacts, Accounts, and Opportunities")
- **JS API**: Creating, updating, or deleting records; describing object metadata; checking org limits

#### Sample SOQL Queries

```sql
-- List all accounts
SELECT Id, Name, Industry, Phone FROM Account LIMIT 10

-- Search contacts by name
SELECT Id, Name, Email FROM Contact WHERE Name LIKE '%John%' LIMIT 10

-- Count leads by status
SELECT Status, COUNT(Id) cnt FROM Lead GROUP BY Status

-- Recent opportunities
SELECT Id, Name, Amount, StageName, CloseDate FROM Opportunity ORDER BY CreatedDate DESC LIMIT 10

-- Describe an object's fields
SELECT QualifiedApiName, DataType, Label FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = 'Account' LIMIT 200

-- Records from the last 7 days
SELECT Id, Name, CreatedDate FROM Account WHERE CreatedDate = LAST_N_DAYS:7 LIMIT 20

-- Subquery with child records
SELECT Id, Name, (SELECT Id, Name FROM Contacts) FROM Account LIMIT 10

-- Lookup a specific record by Id
SELECT Id, Name, Amount, StageName FROM Opportunity WHERE Id = '006dM00000LIlagQAD'
```

#### Sample SOSL Queries

```sql
-- Search across multiple objects
FIND {Acme} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name, Email) LIMIT 20

-- Search in name fields only
FIND {John} IN NAME FIELDS RETURNING Contact(Id, Name, Email), Lead(Id, Name) LIMIT 10

-- Search with wildcards
FIND {Acme*} IN ALL FIELDS RETURNING Account(Id, Name, Industry) LIMIT 20
```

#### Sample JS API (Mutations)

```js
// Insert a new account
conn.sobject("Account").create({ Name: "New Account", Industry: "Technology", Phone: "555-0100" });

// Update an existing contact
conn.sobject("Contact").update({ Id: "003xxx", Email: "newemail@example.com", Phone: "555-0200" });

// Delete a record
conn.sobject("Lead").destroy("00Qxxx");

// Bulk insert multiple records
conn.sobject("Contact").create([
  { LastName: "Smith", Email: "smith@example.com" },
  { LastName: "Jones", Email: "jones@example.com" },
]);

// Describe an object's fields
conn.sobject("Account").describe();

// Get org identity info
conn.identity();

// Check API usage limits
conn.limits();
```

## CI / CD Notes

Self hosted runners

### Windows

```bash
Set-ExecutionPolicy RemoteSigned
```
