[![build-main](https://github.com/synle/sqlui-native/actions/workflows/build-main.yml/badge.svg)](https://github.com/synle/sqlui-native/actions/workflows/build-main.yml)

# [sqlui-native](https://github.com/synle/sqlui-native)

![64](https://user-images.githubusercontent.com/3792401/160178384-638de88f-1712-4419-aed4-b1ef79e5d82a.png)

`sqlui-native` is a simple UI client for most SQL Engines written in Electron. It is compatible with most desktop OS's and support most dialects of RDBMS like MySQL, Microsoft SQL Server, Postgres, SQLite, Cassandra, MongoDB, Redis, Azure CosmosDB and Azure Storage Table.

It supports multiple Windows, so you can have different sets of queries and connections side by side. The connections and queries are all stored locally, so you can continue where you left off in later visits.

## Downloads

Refer to the following link for download information.

- [Sqlui Native Homepage](https://synle.github.io/sqlui-native)

## Supported OS's

- [Windows](https://synle.github.io/sqlui-native/installation#windows) (Tested on Windows 10 and 11)
- [Mac OS](https://synle.github.io/sqlui-native/installation#mac) (Tested on Mac OS Monterey)
- [Debian / Ubuntu](https://synle.github.io/sqlui-native/installation#ubuntu--debian)
- [Redhat / CentOS / Fedora](https://synle.github.io/sqlui-native/installation#redhat--centos--fedora)
  Refer to this link for [Installation Instructions](https://synle.github.io/sqlui-native/installation)

## Supported Database Adapters

The list below are supported data stores.
You can also refer to this link for [General Queries](https://synle.github.io/sqlui-native/guides)

- [MySQL](https://synle.github.io/sqlui-native/guides#mysql)
- [MariaDB](https://synle.github.io/sqlui-native/guides#mariadb)
- [Microsoft](https://synle.github.io/sqlui-native/guides#mssql)
- [PostgresSQL](https://synle.github.io/sqlui-native/guides#postgres)
- [SQLite](https://synle.github.io/sqlui-native/guides#sqlite)
- [Cassandra](https://synle.github.io/sqlui-native/guides#cassandra) (Limited Supported)
- [MongoDB](https://synle.github.io/sqlui-native/guides#mongodb) (Limited Supported)
- [Redis](https://synle.github.io/sqlui-native/guides#redis) (Limited Supported)
- [Azure CosmosDB](https://synle.github.io/sqlui-native/guides#cosmosdb) (Limited Supported)
- [Azure Table Storage (Azure Table)](https://synle.github.io/sqlui-native/guides#aztable) (Limited Supported)

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

This application supports multiple windows / instances. Sessions are used to control which instances it persist the data with.
Also these sessions, and the associated connections and queries are persisted locally. So you can continue where you left off in the future.

![demo-session](https://user-images.githubusercontent.com/3792401/151750740-10ff3497-11b4-4026-bd39-c34b80bc1e3a.gif)

### Dark Mode

Dark mode will be turned on automatically with respect to your OS Preference. You can update settings to prefer Dark Mode or Light Mode if desired.

![demo-darkmode](https://user-images.githubusercontent.com/3792401/151746840-e4889ae1-cab9-4ade-b56b-5a4dbb654712.gif)

### Query Tabs

#### Query Tab Orientation

When there is more than 20 tabs, the query tabs will be wrapped vertically.

![image](https://user-images.githubusercontent.com/3792401/152028900-400605a2-0cb0-48df-9249-8ce060d3a256.png)

#### Reordering Query Tabs

Query tabs can be re-ordered by drag and drop the query tabs bar.

![tab-ordering](https://user-images.githubusercontent.com/3792401/153722628-ea28a940-e33a-4f66-983d-eb3e824e2a1c.gif)

#### Resizing the sidebar

The left sidebar can be resized by clicking and dragging the small section between the sidebar and the query box.

![sidebar-resize](https://user-images.githubusercontent.com/3792401/153722656-10529ff3-e818-4b6d-954c-7bdf57631d11.gif)

### Command Palette

Similar to VS Code and Sublime Text, sqlui-native comes with a command palette that lets you reach your mostly used command via a key combo `CMD + P` or `Ctrl + P` on Windows.

![image](https://user-images.githubusercontent.com/3792401/152029205-5798c53d-6304-40dc-b9d8-11700bfc03f2.png)

### Connection Hints

Sample URI connection string can be accessed by clicking on the `Show Connection Hints` on New / Edit Connection Page. Then you can click on the sample URI connection to use that sample connection string as a starting place.

![image](https://user-images.githubusercontent.com/3792401/152658433-74fdb868-293c-46b4-8bc3-ec0008f32b2d.png)

### Settings

Settings can be accessed via the top right menu icon. It allows you to set up preferred settings for things like Editor and Color Theme, etc...

![image](https://user-images.githubusercontent.com/3792401/152658383-10a204b8-ab45-46be-87f3-03084cc2ae7a.png)

![image](https://user-images.githubusercontent.com/3792401/167707497-82546e72-4a7f-4724-bf1e-8c36836d685d.png)

### Data Migration

If you happens to work with different database engine, there's a chance you want to move data from one engine to another engine. You can use `Data Migration` to craft a query to pull in data from the old engine and select a destination to generate the new schema / data for the new engine.

- `Data Migration` can be accessed from the top right hamburger icon
- From there, you have 2 options to migrate data. Either by a raw JSON or by data from an existing connection.

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

#### Adding new bookmark

- To bookmark a connection or query, open the context menu on the Connection name or Query tab name and choose `Add to Bookmark`.
- Give the bookmarked item a `name` and hit Save.

![image](https://user-images.githubusercontent.com/3792401/176319082-d6091511-8cee-4482-a0df-81e11af8f5ec.png)

![image](https://user-images.githubusercontent.com/3792401/176326012-855b02ec-e87b-4c8e-a2f2-961bc2c76296.png)

#### Open a bookmark

You can select and apply a bookmarked item from bookmarks page which can be accessed via the hamburger menu bar on the top right and select `Bookmarks`

- From there, you can click on the bookmarked name to apply that bookmark item.

![image](https://user-images.githubusercontent.com/3792401/176320070-f1194574-94d8-4626-95a8-4743f8b7eeb7.png)

![image](https://user-images.githubusercontent.com/3792401/176325971-fabcb3ad-efe3-4b19-8383-becc58b9d287.png)

#### Recycle bin

By default, all closed queries and deleted connections will be stored inside of a recycle bin which you can always restore at a later. To access the recycle bin, click on the hamburger menu bar on the top right and select `Recycle Bin`.

- From there you can choose to `Restore` the deleted connections or closed queries.
- To permanently delete the items from sqlui-native, you can choose either `Empty Trash` or `Delete` individual items permanently.

![image](https://user-images.githubusercontent.com/3792401/176087950-36a3ec82-c975-43c8-b225-b044bd81248e.png)

![image](https://user-images.githubusercontent.com/3792401/176088031-63c7bdfb-16a1-481c-9ca3-615043d5f362.png)

##### Hard Delete

If you want to permanently delete those and not put it in the recycle bin, you can set the `Delete Mode` to be hard delete.

![image](https://user-images.githubusercontent.com/3792401/176343562-0f4400b2-881d-4a55-becc-3ad82c564bc6.png)

### Record Pages

#### New Record Page

- New record page can be opened using the `New Record` button underneath the query editor.
- There you need to select Connection / Database / Table you want to create a new record for.
- The form will render where you need to fill out the form data.
- Click on `Generate Script` to generate the query for the insert.

![image](https://user-images.githubusercontent.com/3792401/176941021-dad33a56-55d3-439b-a3a5-600f68f7e049.png)

![image](https://user-images.githubusercontent.com/3792401/176941201-460bd80e-6aa5-467d-987a-7a20637ad807.png)

#### Record Details / Edit Record Page

- Clicking on any record on the query results will bring up the Record Detail page
- There you can toggle the edit mode.
- The form will render where you need to fill out the form data.
- Click on `Generate Script` to generate the query for the insert.

## Contributing

- [Repo](https://github.com/synle/sqlui-native)

### Dev Note

Here is the link where you can find information about how run this application locally.

- [Dev Notes](https://github.com/synle/sqlui-native/blob/main/CONTRIBUTING.md)

## Features / TODO's:

- [x] Consolidate the interface for mocked server and the main.ts page.
- [x] Make a build for Windows and Darwin.
- [x] Added Basic CI/CD to package electron
- [x] Make a build for other systems like Debian / Ubuntu and Redhat.
- [x] Add a configuration / option page for color mode.
- [x] Enhance the table with pagination.
- [x] Enhance the table for result with sorting, and searching.
- [x] Add quick query queries (such as select from a table or do update / insert).
- [x] Add quick query to recreate the table definition (Create Table), Drop Table, etc....
- [x] Add a full screen mode (F11)
- [x] Add ability to save CSV / JSON / Table to files.
- [x] Add ability to support multiple windows and sessions..
- [x] Add ability to import and export connections and queries.
- [x] Add ability to work with multiple instances.
- [ ] Add autocomplete tokens for the query.
- [x] Add dark theme (Dark mode respect system color theme).
- [ ] Add auto update features.
- [ ] Push a build to Microsoft Store.
- [x] Add supports for Cassandra.
- [x] Add supports for Azure CosmosDB.
- [x] Add supports for [Azure Table (Azure Table storage)](https://docs.microsoft.com/en-us/azure/storage/tables/table-storage-overview).
- [ ] Add supports for AWS Redshift.

## Limitations

### sqlite Limitations

sqlite doesn't support multiple statements. So if you have multiple inserts or updates in a single query, it will not work. Refer to this [Stackoverflow post for more details related to sqlite](https://stackoverflow.com/questions/1609637/is-it-possible-to-insert-multiple-rows-at-a-time-in-an-sqlite-database).

If you want to do bulk inserts, use bulk inserts API instead.

```sql
INSERT INTO
  art (Name)
VALUES
  ('Queen'),
  ('Kiss'),
  ('Spyro Gyra')
```

### Cassandra Limitations

Cassandra Keyspaces are mapped to sqlui-native databases. And Cassandra Column Families are mapped to sqlui-native table.

#### How to get connection string for CosmosDB with Cassandra API?

- Go to `Connection String` of the Azure CosmosDB Cassandra

![image](https://user-images.githubusercontent.com/3792401/181765317-6a63b300-ee0e-4041-a49c-e4ec6a698b39.png)

##### Sample CosmosDB with Cassandra API Connection String

It will look something like this.

```
cassandra://USERNAME:PRIMARY PASSWORD@CONTACT POINT:PORT
```

### MongoDB Limitations

MongoDB Collections is mapped to sqlui-native table. We scan the first 5 Documents to come up with the schema for the columns.

#### Create new MongoDB Database

As of now (v1.27.0), you can create new mongodb using the following syntax

```js
db.createDatabase('new-database-name');
```

### Redis Limitations

Due to the size of keys within Redis connection, we will not show all keys in the Redis cache.

- As for SSL Redis support, use the `rediss://` connection scheme.

#### How to get connection string for Azure Redis Cache?

- Go to `Access Keys` on Azure Redis Cache.
  ![image](https://user-images.githubusercontent.com/3792401/183109606-5c07c993-fed7-4877-be31-798a1ea9676d.png)
- Connection will look like
  `rediss://<username>:<password>@<your_redis_host>:<redis_port>`
- Sample connection will look like this. Due to how the URL scheme is parsed, a non empty string is required for the username placeholder. It can be anything but empty string.
  `rediss://azure:Primary_Or_Secondary_Access_Key@syredis1.redis.cache.windows.net:6380`

### Azure CosmosDB Limitations

Azure CosmosDB Databases are mapped to sqlui-native Databases. And Azure CosmosDB Containers are mapped to sqlui-native Tables. We scan the first 5 items to come up with the schema for the columns.

Tested for Azure CosmosDB (with Core SQL).

#### How to get connection string for CosmosDB with Core SQL API?

Here's how to set up the connection. Open your resource, and click on `Keys`. Then copy and use either `PRIMARY CONNECTION STRING` or `SECONDARY CONNECTION STRING`

![image](https://user-images.githubusercontent.com/3792401/168092880-28d066ad-725f-429a-8ebf-92bb7f4f6d68.png)
![image](https://user-images.githubusercontent.com/3792401/168093067-fe0aa98c-297c-4f11-a16e-8c60797de800.png)

##### Sample CosmosDB with Core SQL API Connection String

It will look something like this.

```
cosmosdb://<your_primary_connection_string>

or

cosmosdb://<your_secondary_connection_string>
```

### Azure Table Storage Limitations

Azure Table Storage tables are mapped to sqlui-native Tables. We scan the first 5 items to come up with the schema for the columns.

#### Setting up connection string

Here's how to set up the connection.

![image](https://user-images.githubusercontent.com/3792401/168092476-02b0ddb6-5cff-41fe-9b6a-8a212325999a.png)
![image](https://user-images.githubusercontent.com/3792401/168092539-451ca459-3429-4030-9729-2894a5bbf259.png)

Sample connection will look like this

```
aztable://<your_connection_string>
```

## Suggestion?

Use the following link to file a bug or a suggestion.

- [File a bug or a suggestion?](https://github.com/synle/sqlui-native/issues/new)
