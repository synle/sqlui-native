[![build-main](https://github.com/synle/sqlui-native/actions/workflows/build-main.yml/badge.svg)](https://github.com/synle/sqlui-native/actions/workflows/build-main.yml)

# [sqlui-native](https://github.com/synle/sqlui-native)

![64](https://user-images.githubusercontent.com/3792401/160178384-638de88f-1712-4419-aed4-b1ef79e5d82a.png)

`sqlui-native` is a cross-platform desktop SQL/NoSQL database client and REST API client built with Tauri v2 and a Node.js sidecar. It supports MySQL, MariaDB, Microsoft SQL Server, PostgreSQL, SQLite, Cassandra, MongoDB, Redis, Azure CosmosDB, Azure Table Storage, Salesforce (SFDC), and REST APIs (curl/fetch).

It supports multiple windows, so you can run different sets of queries and connections side by side. Connections and queries are stored locally and persist across sessions.

## Downloads

[Sqlui Native Homepage](https://synle.github.io/sqlui-native)

## Supported Platforms

- [Windows 10/11 (x64 Installer)](https://synle.github.io/sqlui-native/installation#windows)
- [macOS (Apple Silicon M1–M4)](https://synle.github.io/sqlui-native/installation#mac) — see [quarantine troubleshooting](#mac-apple-silicon-m-series---app-is-damaged-error)
- [macOS (Intel x64)](https://synle.github.io/sqlui-native/installation#mac)
- [Ubuntu / Debian / Linux Mint (.deb)](https://synle.github.io/sqlui-native/installation#ubuntu--debian)
- [Linux Other Distros (AppImage)](https://synle.github.io/sqlui-native/installation#linux-other-distro-appimage)

## Supported Database Adapters

Refer to the [query guides](https://synle.github.io/sqlui-native/guides) for dialect-specific syntax and examples.

- [MySQL](https://synle.github.io/sqlui-native/guides#mysql)
- [MariaDB](https://synle.github.io/sqlui-native/guides#mariadb)
- [Microsoft SQL Server](https://synle.github.io/sqlui-native/guides#mssql)
- [PostgreSQL](https://synle.github.io/sqlui-native/guides#postgres)
- [CockroachDB](https://github.com/synle/sqlui-native#cockroachdb-limitations) (limited support via PostgreSQL driver)
- [SQLite](https://synle.github.io/sqlui-native/guides#sqlite)
- [Cassandra](https://synle.github.io/sqlui-native/guides#cassandra) (limited support)
- [MongoDB](https://synle.github.io/sqlui-native/guides#mongodb) (limited support)
- [Redis](https://synle.github.io/sqlui-native/guides#redis) (limited support)
- [Azure CosmosDB](https://synle.github.io/sqlui-native/guides#cosmosdb) (limited support)
- [Azure Table Storage](https://synle.github.io/sqlui-native/guides#aztable) (limited support)
- [Salesforce (SFDC)](https://synle.github.io/sqlui-native/guides#sfdc) (limited support)
- REST API (curl / fetch) — Postman-like API client with `{{variable}}` interpolation

## Features

### Overall Demo

![demo-full](https://user-images.githubusercontent.com/3792401/151750703-419b66f2-938b-4edd-b852-97bfdfa12efd.gif)

### Import and Export

Import and Export can be used to share connections across different machines and users. Below is a sample import config.

```
[
  {
    "_type": "connection",
    "id": "connection.1643485516220.4798705129674932",
    "connection": "postgres://postgres:password@localhost:5432",
    "name": "sy postgres"
  },
  {
    "_type": "query",
    "id": "query.1643561715854.5278536054107370",
    "name": "Employee Query on Postgres",
    "sql": "SELECT\n  *\nFROM\n  employees\nLIMIT\n  10",
    "connectionId": "connection.1643485516220.4798705129674932",
    "databaseId": "music_store"
  }
]
```

You can also drag and drop the file directly into sqlui-native application. At the moment, we only support drag and drop for a single file.

![demo-import-export](https://user-images.githubusercontent.com/3792401/151750721-9ea1ab38-e185-40dd-ba4d-71d28f3ae1d6.gif)

### Session Management

The app supports multiple windows and instances. Each session persists its own connections and queries locally, so you can pick up where you left off.

![demo-session](https://user-images.githubusercontent.com/3792401/151750740-10ff3497-11b4-4026-bd39-c34b80bc1e3a.gif)

### Dark Mode

Dark mode will be turned on automatically with respect to your OS Preference. You can update settings to prefer Dark Mode or Light Mode if desired.

![demo-darkmode](https://user-images.githubusercontent.com/3792401/151746840-e4889ae1-cab9-4ade-b56b-5a4dbb654712.gif)

### Query Tabs

#### Query Tab Orientation

When there are more than 20 tabs, the query tabs wrap vertically.

![image](https://user-images.githubusercontent.com/3792401/152028900-400605a2-0cb0-48df-9249-8ce060d3a256.png)

#### Reordering Query Tabs

Drag and drop query tabs to reorder them.

![tab-ordering](https://user-images.githubusercontent.com/3792401/153722628-ea28a940-e33a-4f66-983d-eb3e824e2a1c.gif)

#### Resizing the Sidebar

Drag the divider between the sidebar and the query editor to resize the sidebar.

![sidebar-resize](https://user-images.githubusercontent.com/3792401/153722656-10529ff3-e818-4b6d-954c-7bdf57631d11.gif)

### Command Palette

Open the command palette with `Cmd+P` (Mac) or `Ctrl+P` (Windows/Linux) to quickly access commands.

![image](https://user-images.githubusercontent.com/3792401/152029205-5798c53d-6304-40dc-b9d8-11700bfc03f2.png)

### Connection Hints

Click `Show Connection Hints` on the New/Edit Connection page to see sample URI connection strings. Click any sample to use it as a starting point.

![image](https://user-images.githubusercontent.com/3792401/152658433-74fdb868-293c-46b4-8bc3-ec0008f32b2d.png)

### Settings

Access settings via the menu icon in the top right corner to configure editor preferences, color theme, and more.

![image](https://user-images.githubusercontent.com/3792401/152658383-10a204b8-ab45-46be-87f3-03084cc2ae7a.png)

![image](https://user-images.githubusercontent.com/3792401/167707497-82546e72-4a7f-4724-bf1e-8c36836d685d.png)

### SQLite-based Storage

Application data (connections, queries, sessions, settings, caches) is stored in a single SQLite database file (`sqlui-native-storage.db`) in the app data directory. This makes import/export simpler compared to the previous approach of many individual JSON files.

On first launch after upgrading, existing JSON storage files are automatically migrated into the SQLite database. The original JSON files are moved to a `backup/` subdirectory (not deleted) so you can restore them if needed by moving them back to the parent directory.

### Data Migration

Use `Data Migration` to move data between database engines. Access it from the top right hamburger menu. You can migrate from:

- An existing connection (queries the source and generates scripts for the target engine)
- Raw JSON data

![image](https://user-images.githubusercontent.com/3792401/176089071-ddfe9c67-46bb-4261-9e2b-0978fa25eee2.png)

![image](https://user-images.githubusercontent.com/3792401/176088421-5b0e6e48-0e44-41ab-b98f-0677feff70d1.png)

#### Migration of Real Existing Connection

Use this data migration option to move data from an existing connection

![image](https://user-images.githubusercontent.com/3792401/176088688-eaba3a95-0bf9-4efa-8513-e7b4c534074f.png)

#### Migration of Raw JSON Data

Use this data migration option to move raw JSON data

![image](https://user-images.githubusercontent.com/3792401/176088775-385777a8-a89b-460c-878d-8bb64af20f84.png)

### Bookmarks

The system allows you to bookmark connections and queries. Bookmarked items can be applied to any workspace.

#### Adding a Bookmark

Right-click a connection name or query tab and choose `Add to Bookmark`. Enter a name and click Save.

![image](https://user-images.githubusercontent.com/3792401/176319082-d6091511-8cee-4482-a0df-81e11af8f5ec.png)

![image](https://user-images.githubusercontent.com/3792401/176326012-855b02ec-e87b-4c8e-a2f2-961bc2c76296.png)

#### Opening a Bookmark

Open the hamburger menu (top right) > `Bookmarks`, then click a bookmark name to apply it.

![image](https://user-images.githubusercontent.com/3792401/176320070-f1194574-94d8-4626-95a8-4743f8b7eeb7.png)

![image](https://user-images.githubusercontent.com/3792401/176325971-fabcb3ad-efe3-4b19-8383-becc58b9d287.png)

#### Recycle Bin

Deleted connections and closed queries are moved to the recycle bin. Access it via the hamburger menu (top right) > `Recycle Bin`.

- **Restore** — recover individual items
- **Delete** — permanently remove individual items
- **Empty Trash** — permanently remove all items

![image](https://user-images.githubusercontent.com/3792401/176087950-36a3ec82-c975-43c8-b225-b044bd81248e.png)

![image](https://user-images.githubusercontent.com/3792401/176088031-63c7bdfb-16a1-481c-9ca3-615043d5f362.png)

##### Hard Delete

To bypass the recycle bin and permanently delete items immediately, set `Delete Mode` to hard delete in Settings.

![image](https://user-images.githubusercontent.com/3792401/176343562-0f4400b2-881d-4a55-becc-3ad82c564bc6.png)

### Relationship Chart (FK Visualization)

Visualize foreign key relationships for relational databases (MySQL, MariaDB, MSSQL, PostgreSQL, SQLite). Right-click a table name and choose `Show Relationships`.

- **Diagram view** — interactive chart with tables as nodes and FK edges (zoom, pan, drag)
- **Table view** — sortable FK list
- Toggle horizontal/vertical layout, expand/collapse edge labels, export as PNG

### Code Snippets

Generate ready-to-use connection code snippets for your database in **Java**, **JavaScript**, and **Python**. Access code snippets from the query script dropdown for any connection.

### Record Pages

#### New Record Page

1. Click `New Record` below the query editor
2. Select the Connection, Database, and Table
3. Fill in the form fields
4. Click `Generate Script` to generate the INSERT query

![image](https://user-images.githubusercontent.com/3792401/176941021-dad33a56-55d3-439b-a3a5-600f68f7e049.png)

![image](https://user-images.githubusercontent.com/3792401/176941201-460bd80e-6aa5-467d-987a-7a20637ad807.png)

#### Record Details / Edit Record Page

Click any row in the query results to open the Record Detail page. Toggle edit mode to modify fields, then click `Generate Script` to generate the UPDATE query.

## Contributing

- [Repo](https://github.com/synle/sqlui-native)

### Dev Notes

See [CONTRIBUTING.md](https://github.com/synle/sqlui-native/blob/main/CONTRIBUTING.md) for how to run the app locally and contribute.

### Adding a New Database Adapter

Want to add support for a new database engine? The project uses an adapter pattern where each database engine implements a standard interface (`IDataAdapter`). A starter template is provided at [`src/common/adapters/_SampleDataAdapter_/`](https://github.com/synle/sqlui-native/tree/main/src/common/adapters/_SampleDataAdapter_).

The high-level steps are:

1. Add a new dialect to `typings/index.ts`
2. Copy the sample adapter template and implement the adapter class (`index.ts`) and script generator (`scripts.ts`)
3. Register your adapter in `DataAdapterFactory.ts` and `DataScriptFactory.ts`
4. Add a dialect icon PNG in your adapter directory and import it in `scripts.ts`
5. Add snapshot tests in `DataScriptFactory.spec.ts`

For the full step-by-step guide with code examples, see the [Adding new adapters](https://github.com/synle/sqlui-native/blob/main/CONTRIBUTING.md#adding-new-adapters) section in CONTRIBUTING.md.

## Roadmap

- [ ] Query autocomplete
- [ ] Auto-update
- [ ] Microsoft Store distribution
- [ ] AWS Redshift adapter

## Troubleshooting

### Mac Apple Silicon (M-Series) - "App is damaged" Error

On macOS 26+ with Apple Silicon (M1/M2/M3/M4), you may see the following error when attempting to open the app:

> "sqlui-native.app" is damaged and can't be opened. You should move it to the Trash.
> <img width="866" height="999" alt="image" src="https://github.com/user-attachments/assets/9a1c12fd-2936-4b77-87a5-217c461ebd56" />

This is caused by macOS quarantine attributes applied to unsigned apps. To fix this, open Terminal and run:

```
xattr -cr /Applications/sqlui-native.app
```

After running the command, you should be able to open sqlui-native normally.

## Limitations

### SQLite Limitations

SQLite does not support multiple statements in a single query. Use bulk insert syntax instead:

```sql
INSERT INTO
  art (Name)
VALUES
  ('Queen'),
  ('Kiss'),
  ('Spyro Gyra')
```

### CockroachDB Limitations

CockroachDB connects via the PostgreSQL driver. Replace `?sslmode=require` with `?sslmode=no-verify` in the connection string:

```
postgres://demo:demo26472@127.0.0.1:26257/movr?sslmode=no-verify
```

### Cassandra Limitations

Cassandra keyspaces map to sqlui-native databases, and column families map to tables.

#### CosmosDB with Cassandra API Connection String

Go to `Connection String` in the Azure CosmosDB Cassandra resource:

![image](https://user-images.githubusercontent.com/3792401/181765317-6a63b300-ee0e-4041-a49c-e4ec6a698b39.png)

##### Sample Connection String

```
cassandra://USERNAME:PRIMARY PASSWORD@CONTACT POINT:PORT
```

### MongoDB Limitations

MongoDB collections map to sqlui-native tables. The schema is inferred by scanning the first 5 documents.

#### Create a New MongoDB Database

```js
db.createDatabase("new-database-name");
```

### Redis Limitations

Not all keys are displayed due to potentially large key sets. For SSL connections, use the `rediss://` scheme.

#### Azure Redis Cache Connection String

Go to `Access Keys` in the Azure Redis Cache resource:
![image](https://user-images.githubusercontent.com/3792401/183109606-5c07c993-fed7-4877-be31-798a1ea9676d.png)

Format: `rediss://<username>:<password>@<host>:<port>`

The username field must be a non-empty string (any value works):

```
rediss://azure:Primary_Or_Secondary_Access_Key@syredis1.redis.cache.windows.net:6380
```

### Azure CosmosDB Limitations

CosmosDB databases map to sqlui-native databases, and containers map to tables. The schema is inferred by scanning the first 5 items. Tested with CosmosDB Core SQL API.

#### CosmosDB Core SQL API Connection String

Open your CosmosDB resource > `Keys`, then copy the `PRIMARY CONNECTION STRING` or `SECONDARY CONNECTION STRING`:

![image](https://user-images.githubusercontent.com/3792401/168092880-28d066ad-725f-429a-8ebf-92bb7f4f6d68.png)
![image](https://user-images.githubusercontent.com/3792401/168093067-fe0aa98c-297c-4f11-a16e-8c60797de800.png)

##### Sample Connection String

```
cosmosdb://<your_primary_or_secondary_connection_string>
```

### Salesforce (SFDC) Limitations

Salesforce SObjects are mapped to sqlui-native Tables, and Salesforce Fields are mapped to sqlui-native Columns. Each connection represents a single Salesforce Org (mapped as a single database).

The adapter supports three query modes:

- **SOQL** (read-only) -- Queries starting with `SELECT` are executed as SOQL
- **SOSL** (read-only search) -- Queries starting with `FIND` are executed as SOSL
- **JS API** (mutations) -- Queries containing `conn.` are executed as JavaScript for create, update, delete, and upsert operations

#### Setting up connection string

1. Sign up for a free Developer Org at [developer.salesforce.com/signup](https://developer.salesforce.com/signup)
2. Get your Security Token: **Avatar > Settings > My Personal Information > Reset My Security Token**
3. Use JSON format for the connection string:

```
sfdc://{"username":"you@yourcompany.dev","password":"your_password","securityToken":"your_token","loginUrl":"login.salesforce.com"}
```

- `loginUrl` defaults to `login.salesforce.com` if omitted. Use `test.salesforce.com` for sandbox orgs.
- `securityToken` can be omitted if your IP is whitelisted.

#### OAuth2 Client Credentials Flow

For orgs using Connected Apps, you can authenticate without a username/password by providing `clientId` and `clientSecret`:

```
sfdc://{"clientId":"your_connected_app_client_id","clientSecret":"your_connected_app_client_secret","loginUrl":"your-org.my.salesforce.com"}
```

Sessions are automatically refreshed when they expire — no manual reconnection needed.

#### Sample queries

```sql
-- SOQL: Select accounts
SELECT Id, Name, Industry FROM Account LIMIT 10

-- SOSL: Search across objects
FIND {keyword} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name) LIMIT 20
```

```js
// JS API: Insert a record
conn.sobject("Account").create({ Name: "New Account", Industry: "Technology" });

// JS API: Update a record
conn.sobject("Account").update({ Id: "001xxx", Name: "Updated Name" });

// JS API: Delete a record
conn.sobject("Account").destroy("001xxx");
```

### Azure Table Storage Limitations

Azure Table Storage tables map to sqlui-native tables. The schema is inferred by scanning the first 5 items.

#### Setting Up Connection String

![image](https://user-images.githubusercontent.com/3792401/168092476-02b0ddb6-5cff-41fe-9b6a-8a212325999a.png)
![image](https://user-images.githubusercontent.com/3792401/168092539-451ca459-3429-4030-9729-2894a5bbf259.png)

```
aztable://<your_connection_string>
```

### REST API Features

- Dual syntax: auto-detects `curl` and `fetch()` input (paste from Chrome DevTools).
- `{{VAR}}` variable interpolation with 4-layer priority (folder > collection > global), plus dynamic variables (`{{$timestamp}}`, `{{$randomUUID}}`).
- Warns on unresolved `{{VAR}}` placeholders after variable resolution.
- Supports proxy (`-x`/`--proxy`), timeouts (`--max-time`, `--connect-timeout`), basic auth (`-u`), SSL bypass (`-k`), redirects (`-L`), and file uploads (`-F`).
- Code snippet generation for JavaScript (fetch), Python (requests), and Java (HttpClient).
- Import from HAR files and Postman Collection v2.1; export as Postman Collection.
- Response viewer with tabs for Body, Headers, Cookies, Timing, and Raw JSON download.

### REST API Limitations

- Requires `curl` installed on the system (pre-installed on macOS and most Linux distributions).
- Uses curl/fetch syntax in the editor — not a visual form builder like Postman.
- No persistent connection — each request is a standalone `curl` subprocess.
- `{{VAR}}` variable interpolation is case-sensitive.
- Connection string format: `rest://{"HOST":"https://httpbin.org"}` (also accepts legacy `restapi://`).
- Folder nesting is limited to 2 levels (Connection → Folder → Request), matching the database/table model.

## Feedback

[File a bug or suggestion](https://github.com/synle/sqlui-native/issues/new)
