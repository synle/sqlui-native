[![build-main](https://github.com/synle/sqlui-native/actions/workflows/build-main.yml/badge.svg)](https://github.com/synle/sqlui-native/actions/workflows/build-main.yml)

# [sqlui-native](https://github.com/synle/sqlui-native)

![64](https://user-images.githubusercontent.com/3792401/160178384-638de88f-1712-4419-aed4-b1ef79e5d82a.png)

`sqlui-native` is a simple UI client for most SQL Engines written in Electron. It is compatible with most desktop OS's and support most dialects of RMBDs like MySQL, Microsoft SQL Server, Postgres, SQLite, Cassandra, MongoDB, Redis and Azure CosmosDB.
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
- [Azure Table Storage (TBD)]()

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
- [ ] Enhance the table for result with sorting, and searching.
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
- [ ] Add supports for [Azure Table (Azure Table storage)](https://docs.microsoft.com/en-us/azure/storage/tables/table-storage-overview).
- [ ] Add supports for AWS Redshift.

## Limitations

### Cassandra Limitations

Cassandra Keyspaces are mapped to sqlui-native databases. And Cassandra Column Families are mapped to sqlui-native table.

### MongoDB Limitations

MongoDB Collections is mapped to sqlui-native table. We scan the first 5 Documents to come up with the schema for the columns.

#### Create new MongoDB Database

As of now (v1.27.0), you can create new mongodb using the following syntax

```js
db.createDatabase('new-database-name');
```

### Redis Limitations

Due to the size of keys within Redis connection, we will not show all keys in the Redis cache.

### Azure CosmosDB Limitations

Azure CosmosDB Databases are mapped to sqlui-native Databases. And Azure CosmosDB Containers are mapped to sqlui-native Tables. We scan the first 5 items to come up with the schema for the columns.

Tested for Azure CosmosDB (with Core SQL). [More information on Azure CosmosDB can be found here](https://docs.microsoft.com/en-us/azure/cosmos-db/introduction)

## Suggestion?

Use the following link to file a bug or a suggestion.

- [File a bug or a suggestion?](https://github.com/synle/sqlui-native/issues/new)
