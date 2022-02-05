import { Express } from 'express';
import {
  getDataAdapter,
  getConnectionMetaData,
  resetConnectionMetaData,
} from './DataAdapterFactory';
import PersistentStorage from './PersistentStorage';
import { SqluiCore, SqluiEnums } from '../typings';

let expressAppContext: Express | undefined;

const _apiCache = {};

const electronEndpointHandlers: any[] = [];
function addDataEndpoint(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  incomingHandler: (req: any, res: any, cache: any) => void,
) {
  const handlerToUse = async (req: any, res: any, cache: any) => {
    try {
      res.header('sqlui-native-session-id', req.headers['sqlui-native-session-id']);
      await incomingHandler(req, res, cache);
    } catch (err: any) {
      res.status(500).send(err);
    }
  };

  if (expressAppContext) {
    // set up the route in the context of express server
    expressAppContext[method](url, async (req, res) => {
      // here we simulate a delay for our mocked server
      const cacheKey = req.headers['sqlui-native-session-id'];
      const apiCache = {
        get(key: SqluiEnums.ServerApiCacheKey) {
          try {
            //@ts-ignore
            return _apiCache[cacheKey][key];
          } catch (err: any) {
            return undefined;
          }
        },
        set(key: SqluiEnums.ServerApiCacheKey, value: any) {
          try {
            //@ts-ignore
            _apiCache[cacheKey] = _apiCache[cacheKey] || {};

            //@ts-ignore
            _apiCache[cacheKey][key] = value;
          } catch (err: any) {}
        },
        json() {
          return JSON.stringify(_apiCache);
        },
      };

      setTimeout(() => handlerToUse(req, res, apiCache), 100);
    });
  } else {
    electronEndpointHandlers.push([method, url, handlerToUse]);
  }
}

export function getEndpointHandlers() {
  return electronEndpointHandlers;
}

export function setUpDataEndpoints(anExpressAppContext?: Express) {
  expressAppContext = anExpressAppContext;

  // query endpoints
  addDataEndpoint('get', '/api/connections', async (req, res, apiCache) => {
    const connections = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    ).list();

    for (const connection of connections) {
      try {
        const engine = getDataAdapter(connection.connection);
        const databases = await engine.getDatabases();

        connection.status = 'online';
        connection.dialect = engine.dialect;
      } catch (err: any) {
        connection.status = 'offline';
        connection.dialect = undefined;
      }
    }

    res.status(200).json(connections);
  });

  addDataEndpoint('get', '/api/connection/:connectionId', async (req, res, apiCache) => {
    const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    ).get(req.params?.connectionId);

    try {
      const engine = getDataAdapter(connection.connection);
      const databases = await engine.getDatabases();

      connection.status = 'online';
      connection.dialect = engine.dialect;
    } catch (err: any) {}

    res.status(200).json(connection);
  });

  addDataEndpoint('get', '/api/connection/:connectionId/databases', async (req, res, apiCache) => {
    const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    ).get(req.params?.connectionId);

    if (!connection) {
      return res.status(404).send('Not Found');
    }

    const engine = getDataAdapter(connection.connection);
    res.status(200).json(await engine.getDatabases());
  });

  addDataEndpoint(
    'get',
    '/api/connection/:connectionId/database/:databaseId/tables',
    async (req, res) => {
      const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(
        req.headers['sqlui-native-session-id'],
        'connection',
      ).get(req.params?.connectionId);
      const engine = getDataAdapter(connection.connection);

      res.status(200).json(await engine.getTables(req.params?.databaseId));
    },
  );

  addDataEndpoint(
    'get',
    '/api/connection/:connectionId/database/:databaseId/table/:tableId/columns',
    async (req, res) => {
      const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(
        req.headers['sqlui-native-session-id'],
        'connection',
      ).get(req.params?.connectionId);
      const engine = getDataAdapter(connection.connection);

      res.status(200).json(await engine.getColumns(req.params?.tableId, req.params?.databaseId));
    },
  );

  addDataEndpoint('post', '/api/connection/:connectionId/connect', async (req, res, apiCache) => {
    const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    ).get(req.params?.connectionId);

    if (!connection) {
      return res.status(404).send('Not Found');
    }

    apiCache.set('serverCacheKey/cacheMetaData', null);

    try {
      const engine = getDataAdapter(connection.connection);
      await engine.authenticate();
      apiCache.set('serverCacheKey/cacheMetaData', null);
      res.status(200).json(await getConnectionMetaData(connection));
    } catch (err: any) {
      // here means we failed to connect, just set back 407 - Not Acceptable
      // here we return the barebone
      res.status(406).json(await resetConnectionMetaData(connection));
    }
  });

  addDataEndpoint('post', '/api/connection/:connectionId/execute', async (req, res, apiCache) => {
    const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    ).get(req.params?.connectionId);

    if (!connection) {
      return res.status(404).send('Not Found');
    }

    const engine = getDataAdapter(connection.connection);
    const sql = req.body?.sql;
    const database = req.body?.database;
    res.status(200).json(await engine.execute(sql, database));
  });

  addDataEndpoint('post', '/api/connection/test', async (req, res, apiCache) => {
    const connection: SqluiCore.CoreConnectionProps = req.body;

    if (!connection.connection) {
      return res.status(400).send('`connection` is required...');
    }

    const engine = getDataAdapter(connection.connection);
    await engine.authenticate();
    res.status(200).json(await getConnectionMetaData(connection));
  });

  addDataEndpoint('post', '/api/connection', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);
    res.status(201).json(
      await new PersistentStorage<SqluiCore.ConnectionProps>(
        req.headers['sqlui-native-session-id'],
        'connection',
      ).add({
        connection: req.body?.connection,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint('put', '/api/connection/:connectionId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);
    res.status(202).json(
      await new PersistentStorage<SqluiCore.ConnectionProps>(
        req.headers['sqlui-native-session-id'],
        'connection',
      ).update({
        id: req.params?.connectionId,
        connection: req.body?.connection,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint('delete', '/api/connection/:connectionId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);
    res
      .status(202)
      .json(
        await new PersistentStorage<SqluiCore.ConnectionProps>(
          req.headers['sqlui-native-session-id'],
          'connection',
        ).delete(req.params?.connectionId),
      );
  });

  // query endpoints
  addDataEndpoint('get', '/api/queries', async (req, res, apiCache) => {
    res
      .status(200)
      .json(
        await new PersistentStorage<SqluiCore.ConnectionQuery>(
          req.headers['sqlui-native-session-id'],
          'query',
        ).list(),
      );
  });

  addDataEndpoint('post', '/api/query', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);
    res.status(201).json(
      await new PersistentStorage<SqluiCore.ConnectionQuery>(
        req.headers['sqlui-native-session-id'],
        'query',
      ).add({
        connection: req.body?.name,
      }),
    );
  });

  addDataEndpoint('put', '/api/query/:queryId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);
    res.status(202).json(
      await new PersistentStorage<SqluiCore.ConnectionQuery>(
        req.headers['sqlui-native-session-id'],
        'query',
      ).update({
        id: req.body.id,
        name: req.body.name,
        connectionId: req.body?.connectionId,
        databaseId: req.body?.databaseId,
        sql: req.body?.sql,
      }),
    );
  });

  addDataEndpoint('delete', '/api/query/:queryId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);
    res
      .status(202)
      .json(
        await new PersistentStorage<SqluiCore.ConnectionQuery>(
          req.headers['sqlui-native-session-id'],
          'query',
        ).delete(req.params?.queryId),
      );
  });

  // session api
  // query endpoints
  addDataEndpoint('get', '/api/sessions', async (req, res, apiCache) => {
    res
      .status(200)
      .json(
        await new PersistentStorage<SqluiCore.Session>(
          req.headers['sqlui-native-session-id'],
          'session',
          'sessions',
        ).list(),
      );
  });

  addDataEndpoint('post', '/api/session', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);
    res.status(201).json(
      await new PersistentStorage<SqluiCore.Session>(
        req.headers['sqlui-native-session-id'],
        'session',
        'sessions',
      ).add({
        connection: req.body?.name,
      }),
    );
  });

  addDataEndpoint('put', '/api/session/:session', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);
    res.status(202).json(
      await new PersistentStorage<SqluiCore.Session>(
        req.headers['sqlui-native-session-id'],
        'session',
        'sessions',
      ).update({
        id: req.params?.session,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint('delete', '/api/session/:sessionId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);
    res
      .status(202)
      .json(
        await new PersistentStorage<SqluiCore.Session>(
          req.headers['sqlui-native-session-id'],
          'session',
          'sessions',
        ).delete(req.params?.queryId),
      );
  });

  // debug endpoints
  addDataEndpoint('get', '/api/debug', async (req, res, apiCache) => {
    res.status(200).json(apiCache.json());
  });
}
