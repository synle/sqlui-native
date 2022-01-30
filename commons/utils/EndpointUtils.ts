import { Express } from 'express';
import {
  RelationalDatabaseEngine,
  getEngine,
  getConnectionMetaData,
  resetConnectionMetaData,
} from './RelationalDatabaseEngine';
import ConnectionUtils from './ConnectionUtils';
import { SqluiCore, SqluiEnums } from '../../typings';
const fs = require('fs');
let expressAppContext: Express | undefined;

const _cache = {};

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
      const instanceid = req.headers.instanceid;
      const apiCache = {
        get(key: SqluiEnums.ServerApiCacheKey) {
          try {
            //@ts-ignore
            return _cache[instanceid][key];
          } catch (err) {
            return undefined;
          }
        },
        set(key: SqluiEnums.ServerApiCacheKey, value: any) {
          try {
            //@ts-ignore
            _cache[instanceid] = _cache[instanceid] || {};

            //@ts-ignore
            _cache[instanceid][key] = value;
          } catch (err) {
            //@ts-ignore
          }
        },
        json() {
          return JSON.stringify(_cache);
        },
      };

      setTimeout(() => handler(req, res, apiCache), 50);
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
      const connections = await new ConnectionUtils(req.headers.instanceid).getConnections();

      for (const connection of connections) {
        try {
          const engine = getEngine(connection.connection);
          const databases = await engine.getDatabases();

          connection.status = 'online';
          connection.dialect = engine.dialect;
        } catch (err) {
          connection.status = 'offline';
          connection.dialect = undefined;
        }
      }

      res.status(200).json(connections);
    } catch (err) {
      res.status(500).send();
    }
  });

  addDataEndpoint('get', '/api/connection/:connectionId', async (req, res, apiCache) => {
    try {
      const connection = await new ConnectionUtils(req.headers.instanceid).getConnection(
        req.params?.connectionId,
      );

      try {
        const engine = getEngine(connection.connection);
        const databases = await engine.getDatabases();

        connection.status = 'online';
        connection.dialect = engine.dialect;
      } catch (err) {}

      res.status(200).json(connection);
    } catch (err) {
      res.status(500).send();
    }
  });

  addDataEndpoint('get', '/api/connection/:connectionId/databases', async (req, res, apiCache) => {
    const connection = await new ConnectionUtils(req.headers.instanceid).getConnection(
      req.params?.connectionId,
    );

    if (!connection) {
      return res.status(404).send('Not Found');
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
        const connection = await new ConnectionUtils(req.headers.instanceid).getConnection(
          req.params?.connectionId,
        );
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
        const connection = await new ConnectionUtils(req.headers.instanceid).getConnection(
          req.params?.connectionId,
        );
        const engine = getEngine(connection.connection);

        res.status(200).json(await engine.getColumns(req.params?.tableId, req.params?.databaseId));
      } catch (err) {
        res.status(500).send();
      }
    },
  );

  addDataEndpoint('post', '/api/connection/:connectionId/connect', async (req, res, apiCache) => {
    const connection = await new ConnectionUtils(req.headers.instanceid).getConnection(
      req.params?.connectionId,
    );

    if (!connection) {
      return res.status(404).send('Not Found');
    }

    apiCache.set('cacheMetaData', null);

    try {
      const engine = getEngine(connection.connection);
      await engine.authenticate();
      apiCache.set('cacheMetaData', null);
      res.status(200).json(await getConnectionMetaData(connection));
    } catch (err) {
      // here means we failed to connect, just set back 407 - Not Acceptable
      // here we return the barebone
      res.status(406).json(await resetConnectionMetaData(connection));
    }
  });

  addDataEndpoint('post', '/api/connection/:connectionId/execute', async (req, res, apiCache) => {
    const connection = await new ConnectionUtils(req.headers.instanceid).getConnection(
      req.params?.connectionId,
    );

    if (!connection) {
      return res.status(404).send('Not Found');
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
      const connection: SqluiCore.CoreConnectionProps = req.body;
      const engine = getEngine(connection.connection);
      await engine.authenticate();
      res.status(200).json(await getConnectionMetaData(connection));
    } catch (err) {
      res.status(500).send(err);
    }
  });

  addDataEndpoint('post', '/api/connection', async (req, res, apiCache) => {
    apiCache.set('cacheMetaData', null);
    try{
      res.status(201).json(
        await new ConnectionUtils(req.headers.instanceid).addConnection({
          connection: req.body?.connection,
          name: req.body?.name,
        }),
      );
    } catch(err){
      res.status(500).send(err);
    }
  });

  addDataEndpoint('put', '/api/connection/:connectionId', async (req, res, apiCache) => {
    apiCache.set('cacheMetaData', null);
    try{
      res.status(202).json(
      await new ConnectionUtils(req.headers.instanceid).updateConnection({
        id: req.params?.connectionId,
        connection: req.body?.connection,
        name: req.body?.name,
      }),
    );
    } catch(err){
      res.status(500).send(err);
    }
  });

  addDataEndpoint('delete', '/api/connection/:connectionId', async (req, res, apiCache) => {
    apiCache.set('cacheMetaData', null);
    try {
      res
        .status(202)
        .json(
          await new ConnectionUtils(req.headers.instanceid).deleteConnection(
            req.params?.connectionId,
          ),
        );
    } catch (err) {
      res.status(500).send();
    }
  });

  addDataEndpoint('get', '/api/metadata', async (req, res, apiCache) => {
    const connections = await new ConnectionUtils(req.headers.instanceid).getConnections();

    if (apiCache.get('cacheMetaData')) {
      return res.status(200).json(apiCache.get('cacheMetaData'));
    }

    const resp: SqluiCore.CoreConnectionMetaData[] = [];

    for (const connection of connections) {
      resp.push(await getConnectionMetaData(connection));
    }

    apiCache.set('cacheMetaData', resp);
    res.status(200).json(resp);
  });

  addDataEndpoint('get', '/api/debug', async (req, res, apiCache) => {
    res.status(200).json(apiCache.json());
  });
}
