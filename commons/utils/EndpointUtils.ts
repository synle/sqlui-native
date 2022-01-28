import { Express } from 'express';
import {
  RelationalDatabaseEngine,
  getEngine,
  getConnectionMetaData,
} from './RelationalDatabaseEngine';
import ConnectionUtils from './ConnectionUtils';
import { Sqlui } from '../../typings';

let expressAppContext: Express | undefined;

const _apiCache = {};
const electronEndpointHandlers: any[] = [];
function addDataEndpoint(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  handler: (req: any, res: any, cache: any) => void,
) {
  if (expressAppContext) {
    // set up the route in the context of express server
    expressAppContext[method](url, async (req, res) => {
      // here we simulate a delay for our mocked server
      setTimeout(() => handler(req, res, _apiCache), 350);
    });
  } else {
    electronEndpointHandlers.push([method, url, handler]);
  }
}

export function getEndpointHandlers() {
  return electronEndpointHandlers;
}

export function setUpDataEndpoints(anExpressAppContext?: Express) {
  expressAppContext = anExpressAppContext;

  addDataEndpoint('get', '/api/connections', async (req, res, apiCache) => {
    try {
      res.status(200).json(await ConnectionUtils.getConnections());
    } catch (err) {
      res.status(500).send();
    }
  });

  addDataEndpoint('get', '/api/connection/:connectionId', async (req, res, apiCache) => {
    try {
      res.status(200).json(await ConnectionUtils.getConnection(req.params?.connectionId));
    } catch (err) {
      res.status(500).send();
    }
  });

  addDataEndpoint('get', '/api/connection/:connectionId/databases', async (req, res, apiCache) => {
    const connection = await ConnectionUtils.getConnection(req.params?.connectionId);

    if(!connection){
      return res.status(404).send('Not Found')
    }

    try {
      const engine = getEngine(connection.connection);

      res.status(200).json(await engine.getDatabases());
    } catch (err) {
      res.status(500).send();
    }
  });

  addDataEndpoint(
    'get',
    '/api/connection/:connectionId/database/:databaseId/tables',
    async (req, res) => {
      try {
        const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
        const engine = getEngine(connection.connection);

        res.status(200).json(await engine.getTables(req.params?.databaseId));
      } catch (err) {
        res.status(500).send();
      }
    },
  );

  addDataEndpoint(
    'get',
    '/api/connection/:connectionId/database/:databaseId/table/:tableId/columns',
    async (req, res) => {
      try {
        const connection = await ConnectionUtils.getConnection(req.params?.connectionId);
        const engine = getEngine(connection.connection);

        res.status(200).json(await engine.getColumns(req.params?.tableId, req.params?.databaseId));
      } catch (err) {
        res.status(500).send();
      }
    },
  );

  addDataEndpoint('post', '/api/connection/:connectionId/connect', async (req, res, apiCache) => {
    const connection = await ConnectionUtils.getConnection(req.params?.connectionId);

    if(!connection){
      return res.status(404).send('Not Found')
    }

    try {
      const engine = getEngine(connection.connection);
      await engine.authenticate();
      apiCache.cacheMetaData = null;
      res.status(200).json(await getConnectionMetaData(connection));
    } catch (err) {
      res.status(500).send();
    }
  });

  addDataEndpoint('post', '/api/connection/:connectionId/execute', async (req, res, apiCache) => {
    const connection = await ConnectionUtils.getConnection(req.params?.connectionId);

    if(!connection){
      return res.status(404).send('Not Found')
    }

    try {
      const engine = getEngine(connection.connection);
      const sql = req.body?.sql;
      const database = req.body?.database;
      res.status(200).json(await engine.execute(sql, database));
    } catch (err) {
      res.status(500).send(err);
    }
  });

  addDataEndpoint('post', '/api/connection/test', async (req, res, apiCache) => {
    try {
      const connection: Sqlui.CoreConnectionProps = req.body;
      const engine = getEngine(connection.connection);
      await engine.authenticate();
      res.status(200).json(await getConnectionMetaData(connection));
    } catch (err) {
      res.status(500).send(err);
    }
  });

  addDataEndpoint('post', '/api/connection', async (req, res, apiCache) => {
    apiCache.cacheMetaData = null;
    res.status(201).json(
      await ConnectionUtils.addConnection({
        connection: req.body?.connection,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint('put', '/api/connection/:connectionId', async (req, res, apiCache) => {
    apiCache.cacheMetaData = null;
    res.status(202).json(
      await ConnectionUtils.updateConnection({
        id: req.params?.connectionId,
        connection: req.body?.connection,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint('delete', '/api/connection/:connectionId', async (req, res, apiCache) => {
    apiCache.cacheMetaData = null;
    try {
      res.status(202).json(await ConnectionUtils.deleteConnection(req.params?.connectionId));
    } catch (err) {
      res.status(500).send();
    }
  });

  addDataEndpoint('get', '/api/metadata', async (req, res, apiCache) => {
    const connections = await ConnectionUtils.getConnections();

    if (apiCache.cacheMetaData) {
      return res.status(200).json(apiCache.cacheMetaData);
    }

    const resp: Sqlui.CoreConnectionMetaData[] = [];

    for (const connection of connections) {
      resp.push(await getConnectionMetaData(connection));
    }

    apiCache.cacheMetaData = resp;
    res.status(200).json(resp);
  });
}
