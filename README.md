# sqlui-native

`sqlui-native` is a simple UI client for most SQL Engines written in Electron. It is compatible with most desktop OS's and support most dialects of RMBDs like MySQL, Microsoft SQL Server, Postgres, SQLite, Cassandra, MongoDB and Redis.

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
![demo-import-export](https://user-images.githubusercontent.com/3792401/151750721-9ea1ab38-e185-40dd-ba4d-71d28f3ae1d6.gif)


### Session Management
This application supports multiple windows / instances. Sessions are used to control which instances it persist the data with.

Also these sessions, and the associated connections and queries are persisted locally. So you can continue where you left off in the future.
![demo-session](https://user-images.githubusercontent.com/3792401/151750740-10ff3497-11b4-4026-bd39-c34b80bc1e3a.gif)

### Dark Mode
Dark mode will be turned on automatically with respect to your OS Preference. You can update settings to prefer Dark Mode or Light Mode if desired.
![demo-darkmode](https://user-images.githubusercontent.com/3792401/151746840-e4889ae1-cab9-4ade-b56b-5a4dbb654712.gif)


### Query Tabs
When there is more than 20 tabs, the query tabs will be wrapped vertically.
![image](https://user-images.githubusercontent.com/3792401/152028900-400605a2-0cb0-48df-9249-8ce060d3a256.png)

### Command Palette
Similar to VS Code and Sublime Text, sqlui-native comes with a command palette that lets you reach your mostly used command via a key combo `CMD + P` or `Ctrl + P` on Windows.
![image](https://user-images.githubusercontent.com/3792401/152029205-5798c53d-6304-40dc-b9d8-11700bfc03f2.png)

### Connection Hints
Sample URI connection string can be accessed by clicking on the `Show Connection Hints` on New / Edit Connection Page. Then you can click on the sample URI connection to use that sample connection string as a starting place.

![image](https://user-images.githubusercontent.com/3792401/152658433-74fdb868-293c-46b4-8bc3-ec0008f32b2d.png)


### Settings
Settings can be accessed via the top right menu icon. It allows you to set up preferred settings for things like Editor and Color Theme, etc...

![image](https://user-images.githubusercontent.com/3792401/152658383-10a204b8-ab45-46be-87f3-03084cc2ae7a.png)

![image](https://user-images.githubusercontent.com/3792401/152658348-fc4c295f-0b45-463b-b543-7a97101669c8.png)


## Contributing
- [Repo](https://github.com/synle/sqlui-native)

### Dev Note
Here is the link where you can find information about how run this application locally.
- [Dev Notes](https://github.com/synle/sqlui-native/blob/main/DEV.md)

## Features / TODO's:
- [X] Consolidate the interface for mocked server and the main.ts page.
- [X] Make a build for Windows and Darwin.
- [X] Added Basic CI/CD to package electron
- [X] Make a build for other systems like Debian / Ubuntu and Redhat.
- [X] Add a configuration / option page for color mode.
- [X] Enhance the table with pagination.
- [ ] Enhance the table for result with sorting, and searching.
- [X] Add quick query queries (such as select from a table or do update / insert).
- [X] Add quick query to recreate the table definition (Create Table), Drop Table, etc....
- [X] Add a full screen mode (F11)
- [X] Add ability to save CSV / JSON / Table to files.
- [X] Add ability to support multiple windows and sessions..
- [X] Add ability to import and export connections and queries.
- [X] Add ability to work with multiple instances.
- [ ] Add autocomplete tokens for the query.
- [X] Add dark theme (Dark mode respect system color theme).
- [ ] Add auto update features.
- [ ] Push a build to Microsoft Store.
- [X] Add supports for Cassandra
- [ ] Add supports for Azure Table, and AWS Redshift.

## Limitations

### Cassandra Limitations
Cassandra Keyspaces are mapped to sqlui-native databases. And Cassandra Column Families are mapped to sqlui-native table.

### MongoDB Limitations
MongoDB Collections is mapped to sqlui-native table. We scan the first 5 Documents to come up with the schema for the columns.

#### Create new MongoDB Database
Given the limitation of the mongodb NodeJS library, there is not a direct API that we can use to create the MongoDB database. 

- To create a mongoDB database, simply duplicate your existing DB connection
- Update the connection string to add the new database name to the end of the list.
- Then execute the following `db.createCollection("some_collection_name")` to create at least one collection.

![image](https://user-images.githubusercontent.com/3792401/153538969-613f34e9-ce61-470d-ab4c-92f2c6db2196.png)
![image](https://user-images.githubusercontent.com/3792401/153538995-0ea825b9-124e-4799-9af0-3c7dc2255f5d.png)
![image](https://user-images.githubusercontent.com/3792401/153539332-5a78867d-f454-45eb-8ff1-a82a6b91be1a.png)


### Redis Limitations
Due to the size of keys within Redis connection, we will not show all keys in the Redis cache.

## Suggestion?
Use the following link to file a bug or a suggestion.
- [File a bug or a suggestion?](https://github.com/synle/sqlui-native/issues/new)

