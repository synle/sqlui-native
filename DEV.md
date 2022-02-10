## Bootstrap script for connections

### Requirement
- Node 14+


### Sample Import Files
```
[
  {
    "_type": "connection",
    "id": "connection.1643485467072.6333713976068809",
    "name": "sy mysql",
    "connection": "mysql://root:password@localhost:3306"
  },
  {
    "_type": "connection",
    "id": "connection.1643485479951.8848237338571023",
    "name": "sy mariadb",
    "connection": "mariadb://root:password@localhost:33061"
  },
  {
    "_type": "connection",
    "id": "connection.1643485495810.296972129680364",
    "name": "sy sql server",
    "connection": "mssql://sa:password123!@localhost:1433"
  },
  {
    "_type": "connection",
    "id": "connection.1643485516220.4798705129674932",
    "name": "sy postgres",
    "connection": "postgres://postgres:password@localhost:5432"
  },
  {
    "_type": "connection",
    "id": "connection.1643485607366.2475344250499598",
    "name": "sy sqlite",
    "connection": "sqlite://db.test"
  },
  {
    "_type": "connection",
    "id": "connection.1643837396621.9385585085281324",
    "connection": "cassandra://localhost:9042",
    "name": "cassandra"
  },
  {
    "_type": "query",
    "id": "query.1643578195409.9745654678705536",
    "name": "Simple Select Query",
    "sql": "SELECT\n  *\nFROM\n  artists\nLIMIT\n  10",
    "connectionId": "connection.1643485467072.6333713976068809",
    "databaseId": "music_store"
  }
]
```



### How to run locally?

#### In an electron container
```
npm install
npm start
```

#### In a mocked server container
Run this and test it in the browser
```
npm install
npm run dev
# then open a browser with URL
# http://localhost:3000
```


### To package
```
npm run build
cd build
npm install
npm run dist
```


### Where is the config / data stored on local machine?
```
# Windows
C:\Users\some_username\AppData\Roaming\sqlui-native

# Mac
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
docker run --name sqlui_mssql -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=password123!" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2019-latest

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

```




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
