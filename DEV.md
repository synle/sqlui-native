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
    "_type": "query",
    "id": "query.1643578195409.9745654678705536",
    "name": "aaa",
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

# terminal 1
npm run start-webapp

# terminal 2
npm run start-mocked
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
Docker can be used to spin off these database engines. Refer to (this repo for the SQL dumps)[https://github.com/synle/sqlui-core].

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
docker run --name sqlui_cassandra -p 9042:9042 -d cassandra:latest

  # use qlsh
  docker exec -it sqlui_cassandra cqlsh
```



## Sample runbooks
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
