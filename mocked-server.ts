import express from 'express';
import { RelationalDatabaseEngine } from './src/utils/RelationalDatabaseEngine';

const app = express()
const port = 3001

type ConnectionProps = {
  id: string;
  connection: string;
  name: string;
  [index: string]: any;
};

// this section of the api is caches in memory
const caches: { [index: string]: ConnectionProps } = {};
let id = 0;

const ConnectionUtils = {
  addConnection(connection: string, name: string): ConnectionProps {
    const newId = `${++id}.${Date.now()}`;

    caches[newId] = {
      id: newId,
      connection,
      name,
    };

    return caches[newId];
  },

  updateConnection(connection: ConnectionProps): ConnectionProps {
    caches[connection.id] = {
      ...caches[connection.id],
      ...connection,
    };

    return caches[connection.id];
  },

  getConnections(): ConnectionProps[] {
    return Object.values(caches);
  },

  getConnection(id: string): ConnectionProps {
    return caches[id];
  },

  deleteConnection(id: string) {
    delete caches[id];
  },
};

// const engine = new RelationalDatabaseEngine('mssql://sa:password123!@localhost:1433');
ConnectionUtils.addConnection(`mysql://root:password@localhost:3306`, 'sqlui_test_mysql');
ConnectionUtils.addConnection(`mssql://sa:password123!@localhost:1433`, 'sqlui_test_mssql');
ConnectionUtils.addConnection(`mariadb://root:password@localhost:33061`, 'sqlui_test_mariadb');
ConnectionUtils.addConnection(`postgres://postgres:password@localhost:5432`, 'sqlui_test_postgres');
ConnectionUtils.addConnection(`sqlite://test.db`, 'sqlui_test_sqlite');

app.get('/api/connections', async (req, res) => {
  res.json(await ConnectionUtils.getConnections());
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
