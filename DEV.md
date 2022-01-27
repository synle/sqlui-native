## Bootstrap script for connections

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
''' > connections.json
```
