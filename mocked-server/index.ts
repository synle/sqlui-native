import express from 'express';
import { RelationalDatabaseEngine } from './utils/RelationalDatabaseEngine';

const app = express();
const port = 3001;

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
    const newId = `db.${++id}`;

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

ConnectionUtils.addConnection(`mysql://root:password@localhost:3306`, 'sqlui_test_mysql');
// ConnectionUtils.addConnection(`mssql://sa:password123!@localhost:1433`, 'sqlui_test_mssql');
// ConnectionUtils.addConnection(`mariadb://root:password@localhost:33061`, 'sqlui_test_mariadb');
// ConnectionUtils.addConnection(`postgres://postgres:password@localhost:5432`, 'sqlui_test_postgres');
// ConnectionUtils.addConnection(`sqlite://test.db`, 'sqlui_test_sqlite');

const engines: { [index: string]: RelationalDatabaseEngine } = {};
function getEngine(connection: string) {
  if (engines[connection]) {
    return engines[connection];
  }
  const engine = new RelationalDatabaseEngine(connection);
  engines[connection] = engine;
  return engine;
}

app.get('/api/connections', async (req, res) => {
  res.json(await ConnectionUtils.getConnections());
});

app.get('/api/connection/:connectionId', async (req, res) => {
  res.json(await ConnectionUtils.getConnection(req.params?.connectionId));
});

app.get('/api/connection/:connectionId/databases', async (req, res) => {
  const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
  const engine = getEngine(connection.connection);
  res.json(await engine.getDatabases());
});

app.get('/api/connection/:connectionId/database/:databaseId/tables', async (req, res) => {
  const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
  const engine = getEngine(connection.connection);
  res.json(await engine.getTables(req.params?.databaseId));
});

app.get(
  '/api/connection/:connectionId/database/:databaseId/table/:tableId/columns',
  async (req, res) => {
    const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
    const engine = getEngine(connection.connection);
    res.json(await engine.getColumns(req.params?.tableId, req.params?.databaseId));
  },
);

app.post('/api/connection/:connectionId/execute', async (req, res) => {
  const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
  const engine = getEngine(connection.connection);
  // const sql = req?.inputs?.sql;
  // const database = req?.inputs?.database;
  // res.json(await engine.execute(sql, database));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
