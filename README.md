# sqlui-native

`sqlui-native` is a simple UI client for most SQL Engines written in Electron. It is compatible with most desktop OS's and support most dialects of RMBDs like MySQL, Microsoft SQL Server, Postgres and SQLite.

It supports multiple windows, so you can have different sets of queries and connections side by side. The connections and queries are all stored locally, so you can continue where you left off in later visits.

## Downloads
At this point, we only have prebuilt binaries for Windows and Mac. Refer to the following link for download information.
- [Sqlui Native Homepage](https://synle.github.io/sqlui-native)

## About me
- [linkedin.com/in/syle1021](https://www.linkedin.com/in/syle1021/)
- [github.com/synle](https://github.com/synle)

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
This application supports multiple windows / instances. Sessions are used to control which instances it persist the data with. By default, any new Window created will be instantiated with the default session. There you can decide to change it if desired.

Also these sessions, and the associated connections and queries are persisted locally. So you can continue where you left off in the future.
![demo-session](https://user-images.githubusercontent.com/3792401/151750740-10ff3497-11b4-4026-bd39-c34b80bc1e3a.gif)

### Dark Mode
Dark mode will be turned on automatically with respect to your OS Preference.
![demo-darkmode](https://user-images.githubusercontent.com/3792401/151746840-e4889ae1-cab9-4ade-b56b-5a4dbb654712.gif)


### Query Tabs
When there is more than 20 tabs, the query tabs will be wrapped vertically.
![image](https://user-images.githubusercontent.com/3792401/152028900-400605a2-0cb0-48df-9249-8ce060d3a256.png)

### Command Palette
Similar to VS Code and Sublime Text, sqlui-native comes with a command palette that lets you reach your mostly used command via a key combo `CMD + P` or `Ctrl + P` on Windows.
![image](https://user-images.githubusercontent.com/3792401/152029205-5798c53d-6304-40dc-b9d8-11700bfc03f2.png)

## Contributing
- [Repo](https://github.com/synle/sqlui-native)

### Dev Note
Here is the link where you can find information about how run this application locally.
- [Dev Notes](https://github.com/synle/sqlui-native/blob/main/DEV.md)

## Features / TODO's:
- [X] Consolidate the interface for mocked server and the main.ts page.
- [X] Make a build for Windows and Darwin.
- [X] Added Basic CI/CD to package electron
- [X] Make a build for other systems like Debian and Redhat.
- [ ] Add a configuration / option page.
- [ ] Enhance the table for result with sorting, searching and pagination.
- [X] Add quick query queries (such as select from a table or do update / insert).
- [ ] Add quick query to recreate the table definition (Create Table), Drop Table, etc....
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

## Suggestion?
Use the following link to file a bug or a suggestion.
- [File a bug or a suggestion?](https://github.com/synle/sqlui-native/issues/new)
