import express from 'express';
import bodyParser from 'body-parser';
import {
  RelationalDatabaseEngine,
  getEngine,
  getConnectionMetaData,
} from './commons/utils/RelationalDatabaseEngine';
import ConnectionUtils from './commons/utils/ConnectionUtils';
import { Sqlui } from 'typings';

const port = 3001;
const app = express();

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json

app.get('/api/connections', async (req, res) => {
  try {
    res.json(await ConnectionUtils.getConnections());
  } catch (err) {
    res.status(500).send();
  }
});

app.get('/api/connection/:connectionId', async (req, res) => {
  try {
    res.json(await ConnectionUtils.getConnection(req.params?.connectionId));
  } catch (err) {
    res.status(500).send();
  }
});

app.get('/api/connection/:connectionId/databases', async (req, res) => {
  const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
  const engine = getEngine(connection.connection);
  try {
    res.json(await engine.getDatabases());
  } catch (err) {
    res.status(500).send();
  }
});

app.get('/api/connection/:connectionId/database/:databaseId/tables', async (req, res) => {
  const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
  const engine = getEngine(connection.connection);
  try {
    res.json(await engine.getTables(req.params?.databaseId));
  } catch (err) {
    res.status(500).send();
  }
});

app.get(
  '/api/connection/:connectionId/database/:databaseId/table/:tableId/columns',
  async (req, res) => {
    const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
    const engine = getEngine(connection.connection);
    try {
      res.json(await engine.getColumns(req.params?.tableId, req.params?.databaseId));
    } catch (err) {
      res.status(500).send();
    }
  },
);

app.post('/api/connection/:connectionId/connect', async (req, res) => {
  try {
    const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
    const engine = getEngine(connection.connection);
    await engine.authenticate();
    cacheMetaData = null;
    res.json(await getConnectionMetaData(connection));
  } catch (err) {
    res.status(500).send();
  }
});

app.post('/api/connection/:connectionId/execute', async (req, res) => {
  const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
  const engine = getEngine(connection.connection);
  const sql = req.body?.sql;
  const database = req.body?.database;
  try {
    res.json(await engine.execute(sql, database));
  } catch (err) {
    res.status(500);
    res.send('Server Error');
  }
});

app.post('/api/connection/test', async (req, res) => {
  try {
    const connection: Sqlui.CoreConnectionProps = req.body;
    const engine = getEngine(connection.connection);
    await engine.authenticate();
    res.json(await getConnectionMetaData(connection));
  } catch (err) {
    res.status(500);
    res.send('Server Error');
  }
});

app.post('/api/connection', async (req, res) => {
  cacheMetaData = null;
  res.json(
    await ConnectionUtils.addConnection({ connection: req.body?.connection, name: req.body?.name }),
  );
});

app.put('/api/connection/:connectionId', async (req, res) => {
  cacheMetaData = null;
  res.json(
    await ConnectionUtils.updateConnection({
      id: req.params?.connectionId,
      connection: req.body?.connection,
      name: req.body?.name,
    }),
  );
});

app.delete('/api/connection/:connectionId', async (req, res) => {
  cacheMetaData = null;
  try {
    res.json(await ConnectionUtils.deleteConnection(req.params?.connectionId));
  } catch (err) {
    res.status(500).send();
  }
});

let cacheMetaData: any;
app.get('/api/metadata', async (req, res) => {
  const connections = await ConnectionUtils.getConnections();

  if (cacheMetaData) {
    return res.json(cacheMetaData);
  }

  const resp: Sqlui.CoreConnectionMetaData[] = [];

  for (const connection of connections) {
    resp.push(await getConnectionMetaData(connection));
  }

  cacheMetaData = resp;
  res.json(resp);
});

app.listen(port, () => {
  console.log(`SQLUI Native Mocked Server started and listening on port ${port}`);
});
