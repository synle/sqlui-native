## Bootstrap script for connections


### Populating data
```
echo '''
{
  "connection.1643251404217.1": {
    "id": "connection.1643251404217.1",
    "name": "sqlui_test_mysql",
    "connection": "mysql://root:password@localhost:3306"
  },
  "connection.1643251404218.2": {
    "id": "connection.1643251404218.2",
    "name": "sqlui_test_mssql",
    "connection": "mssql://sa:password123!@localhost:1433"
  },
  "connection.1643251404218.3": {
    "id": "connection.1643251404218.3",
    "name": "sqlui_test_mariadb",
    "connection": "mariadb://root:password@localhost:33061"
  },
  "connection.1643251404224.4": {
    "id": "connection.1643251404224.4",
    "name": "sqlui_test_postgres",
    "connection": "postgres://postgres:password@localhost:5432"
  }
}
''' > connections-mocked-server.json
```


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
    "id": "query.1643485530193.5025920115018354",
    "name": "Query 1/29/2022, 11:45:30 AM",
    "sql": ""
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
