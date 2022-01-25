import express from 'express';
import bodyParser from 'body-parser';
import { RelationalDatabaseEngine } from './utils/RelationalDatabaseEngine';
import { Sqlui } from '../typings';

const port = 3001;
const app = express();

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json

// this section of the api is caches in memory
const caches: { [index: string]: Sqlui.ConnectionProps } = {};
let id = 0;

const ConnectionUtils = {
  addConnection(connection: Sqlui.AddConnectionProps): Sqlui.ConnectionProps {
    const newId = `connection.${++id}`;

    caches[newId] = {
      id: newId,
      name: connection.name,
      connection: connection.connection,
    };

    return caches[newId];
  },

  updateConnection(connection: Sqlui.ConnectionProps): Sqlui.ConnectionProps {
    caches[connection.id] = {
      ...caches[connection.id],
      ...connection,
    };

    return caches[connection.id];
  },

  getConnections(): Sqlui.ConnectionProps[] {
    return Object.values(caches);
  },

  getConnection(id: string): Sqlui.ConnectionProps {
    return caches[id];
  },

  deleteConnection(id: string) {
    delete caches[id];
  },
};

ConnectionUtils.addConnection({
  connection: `mysql://root:password@localhost:3306`,
  name: 'sqlui_test_mysql',
});
ConnectionUtils.addConnection({
  connection: `mssql://sa:password123!@localhost:1433`,
  name: 'sqlui_test_mssql',
});
ConnectionUtils.addConnection({
  connection: `mariadb://root:password@localhost:33061`,
  name: 'sqlui_test_mariadb',
});
ConnectionUtils.addConnection({
  connection: `postgres://postgres:password@localhost:5432`,
  name: 'sqlui_test_postgres',
});
// ConnectionUtils.addConnection({ connection: `sqlite://test.db`, name: 'sqlui_test_sqlite' });

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
  const sql = req.body?.sql;
  const database = req.body?.database;
  res.json(await engine.execute(sql, database));
});

app.post('/api/connection', async (req, res) => {
  res.json(
    await ConnectionUtils.addConnection({ connection: req.body?.connection, name: req.body?.name }),
  );
});

app.put('/api/connection/:connectionId', async (req, res) => {
  res.json(
    await ConnectionUtils.updateConnection({
      id: req.params?.connectionId,
      connection: req.body?.connection,
      name: req.body?.name,
    }),
  );
});

app.delete('/api/connection/:connectionId', async (req, res) => {
  res.json(await ConnectionUtils.deleteConnection(req.params?.connectionId));
});


let cacheMetaData: any;
app.get('/api/metadata', async (req, res) => {
  const connections = await ConnectionUtils.getConnections();

  if(cacheMetaData){
    return res.json(cacheMetaData);
  }

  const resp: any[] = [];

  for (const connection of connections) {
    const engine = getEngine(connection.connection);

    const connItem = { ...connection, databases: [] };
    resp.push(connItem);

    const databases = await engine.getDatabases();
    for (const database of databases) {
      const dbItem = {
        name: database,
        tables: [],
      };

      // @ts-ignore
      connItem.databases.push(dbItem);

      let tables: any[] = [];
      try {
        tables = await engine.getTables(database);
        //console.log('getting tables', database, tables);
      } catch (err) {
        //console.log('failed getting tables', database);
      }

      for (const table of tables) {
        let columns = undefined;

        try {
          columns = await engine.getColumns(table, database);
        } catch (err) {
          //console.log('failed getting columns', database, table);
        }

        const tblItem = {
          name: table,
          columns,
        };

        // @ts-ignore
        dbItem.tables.push(tblItem);
      }
    }
  }

  cacheMetaData = resp;

  res.json(resp);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
