import { Express } from 'express';
import {
  getColumns,
  getConnectionMetaData,
  getDataAdapter,
  getDatabases,
  getTables,
  resetConnectionMetaData,
} from 'src/common/adapters/DataAdapterFactory';
import PersistentStorage from 'src/common/PersistentStorage';
import { SqluiCore, SqluiEnums } from 'typings';
import * as sessionUtils from 'src/common/utils/sessionUtils';
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
      res.header('sqlui-native-window-id', req.headers['sqlui-native-window-id']);
      await incomingHandler(req, res, cache);
    } catch (err: any) {
      console.log('err', err);
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

  //=========================================================================
  // connection api endpoints
  //=========================================================================
  addDataEndpoint('get', '/api/connections', async (req, res, apiCache) => {
    const connectionsStorage = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    );

    const connections = await connectionsStorage.list();

    const promisesCheckConnections: Promise<void>[] = [];
    for (const connection of connections) {
      promisesCheckConnections.push(
        new Promise(async (resolve) => {
          try {
            const engine = getDataAdapter(connection.connection);
            await engine.authenticate();

            connection.status = 'online';
            connection.dialect = engine.dialect;
          } catch (err: any) {
            connection.status = 'offline';
            connection.dialect = undefined;
          }

          resolve();
        }),
      );
    }

    await Promise.all(promisesCheckConnections);

    res.status(200).json(connections);
  });

  addDataEndpoint('post', '/api/connections', async (req, res, apiCache) => {
    const connectionsStorage = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    );

    const connections = await connectionsStorage.set(req.body);

    res.status(200).json(connections);
  });

  addDataEndpoint('get', '/api/connection/:connectionId', async (req, res, apiCache) => {
    const connectionsStorage = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    );

    const connection = await connectionsStorage.get(req.params?.connectionId);

    try {
      const engine = getDataAdapter(connection.connection);
      await engine.getDatabases();

      connection.status = 'online';
      connection.dialect = engine.dialect;
    } catch (err: any) {}

    res.status(200).json(connection);
  });

  addDataEndpoint('get', '/api/connection/:connectionId/databases', async (req, res, apiCache) => {
    res
      .status(200)
      .json(await getDatabases(req.headers['sqlui-native-session-id'], req.params?.connectionId));
  });

  addDataEndpoint(
    'get',
    '/api/connection/:connectionId/database/:databaseId/tables',
    async (req, res) =>
      res
        .status(200)
        .json(
          await getTables(
            req.headers['sqlui-native-session-id'],
            req.params?.connectionId,
            req.params?.databaseId,
          ),
        ),
  );

  addDataEndpoint(
    'get',
    '/api/connection/:connectionId/database/:databaseId/table/:tableId/columns',
    async (req, res) =>
      res
        .status(200)
        .json(
          await getColumns(
            req.headers['sqlui-native-session-id'],
            req.params?.connectionId,
            req.params?.databaseId,
            req.params?.tableId,
          ),
        ),
  );

  addDataEndpoint('post', '/api/connection/:connectionId/connect', async (req, res, apiCache) => {
    const connectionsStorage = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    );

    const connection = await connectionsStorage.get(req.params?.connectionId);

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
    const connectionsStorage = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    );

    const connection = await connectionsStorage.get(req.params?.connectionId);

    if (!connection) {
      return res.status(404).send('Not Found');
    }

    const engine = getDataAdapter(connection.connection);

    res.status(200).json(await engine.execute(req.body?.sql, req.body?.database, req.body?.table));
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

    const connectionsStorage = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    );

    res.status(201).json(
      await connectionsStorage.add({
        connection: req.body?.connection,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint('put', '/api/connection/:connectionId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const connectionsStorage = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    );

    res.status(202).json(
      await connectionsStorage.update({
        id: req.params?.connectionId,
        connection: req.body?.connection,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint('delete', '/api/connection/:connectionId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const connectionsStorage = await new PersistentStorage<SqluiCore.ConnectionProps>(
      req.headers['sqlui-native-session-id'],
      'connection',
    );

    res.status(202).json(await connectionsStorage.delete(req.params?.connectionId));
  });
  //=========================================================================
  // query api endpoints
  //=========================================================================
  addDataEndpoint('get', '/api/queries', async (req, res, apiCache) => {
    const queryStorage = await new PersistentStorage<SqluiCore.ConnectionQuery>(
      req.headers['sqlui-native-session-id'],
      'query',
    );

    res.status(200).json(await queryStorage.list());
  });

  addDataEndpoint('post', '/api/query', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const queryStorage = await new PersistentStorage<SqluiCore.ConnectionQuery>(
      req.headers['sqlui-native-session-id'],
      'query',
    );

    res.status(201).json(
      await queryStorage.add({
        connection: req.body?.name,
      }),
    );
  });

  addDataEndpoint('put', '/api/query/:queryId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const queryStorage = await new PersistentStorage<SqluiCore.ConnectionQuery>(
      req.headers['sqlui-native-session-id'],
      'query',
    );

    res.status(202).json(
      await queryStorage.update({
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

    const queryStorage = await new PersistentStorage<SqluiCore.ConnectionQuery>(
      req.headers['sqlui-native-session-id'],
      'query',
    );

    res.status(202).json(await queryStorage.delete(req.params?.queryId));
  });
  //=========================================================================
  // session api endpoints
  //=========================================================================
  // get the current session
  addDataEndpoint('get', '/api/session', async (req, res, apiCache) => {
    const windowId = req.headers['sqlui-native-window-id'];
    if(!windowId){
      // windowId is required
      return res.status(404).json(null);
    }

    console.log('window_id', windowId)

    let sessionId = await sessionUtils.getByWindowId(windowId);
    if(!sessionId){
      return res.status(404).json(null);
    }

    // let's not do this
    // if(!sessionId){
    //   // open the default session id
    //   sessionId = await sessionUtils.open(windowId);
    // }

    const sessionsStorage = await new PersistentStorage<SqluiCore.Session>(
      'session',
      'session',
      'sessions',
    );

    const session = await sessionsStorage.get(sessionId);

    console.log('> TODO GET', sessionUtils.get());

    // TODO see if we need to start over with a new session
    if(!session){
      return res.status(404).json(null);
    }

    res.status(200).json(session);
  });

  addDataEndpoint('get', '/api/sessions', async (req, res, apiCache) => {
    const sessionsStorage = await new PersistentStorage<SqluiCore.Session>(
      'session',
      'session',
      'sessions',
    );

    res.status(200).json(await sessionsStorage.list());
  });

  addDataEndpoint('get', '/api/sessions/opened', async (req, res, apiCache) => {
    res.status(200).json(await sessionUtils.listSessionIds());
  });

  addDataEndpoint('post', '/api/sessions/opened/:sessionId', async (req, res, apiCache) => {
    const windowId = req.headers['sqlui-native-window-id'];
    if(!windowId){
      throw 'windowId is required'
    }

    const newSessionId = req.params?.sessionId;
    await sessionUtils.open(windowId, newSessionId);

    console.log('> TODO POST', windowId, newSessionId);
    console.log('> TODO POST', sessionUtils.get());

    res.status(200).json(await sessionUtils.get());
  });

  addDataEndpoint('post', '/api/session', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const sessionsStorage = await new PersistentStorage<SqluiCore.Session>(
      'session',
      'session',
      'sessions',
    );

    res.status(201).json(
      await sessionsStorage.add({
        connection: req.body?.name,
      }),
    );
  });

  addDataEndpoint('put', '/api/session/:sessionId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const sessionsStorage = await new PersistentStorage<SqluiCore.Session>(
      'session',
      'session',
      'sessions',
    );

    res.status(202).json(
      await sessionsStorage.update({
        id: req.params?.sessionId,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint('delete', '/api/session/:sessionId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const sessionsStorage = await new PersistentStorage<SqluiCore.Session>(
      'session',
      'session',
      'sessions',
    );

    res.status(202).json(await sessionsStorage.delete(req.params?.sessionId));
  });
  //=========================================================================
  // folder items endpoints used in bookmarks and recycle bin
  //=========================================================================
  // this get a list of all items in a folder
  addDataEndpoint('get', '/api/folder/:folderId', async (req, res, apiCache) => {
    const folderItemsStorage = await new PersistentStorage<SqluiCore.FolderItem>(
      'folders',
      req.params?.folderId,
    );

    res.status(200).json(await folderItemsStorage.list());
  });

  // adds item to recycle bin
  addDataEndpoint('post', '/api/folder/:folderId', async (req, res, apiCache) => {
    const folderItemsStorage = await new PersistentStorage<SqluiCore.FolderItem>(
      'folders',
      req.params?.folderId,
    );

    res.status(202).json(
      await folderItemsStorage.add({
        name: req.body.name,
        type: req.body.type,
        data: req.body.data,
      }),
    );
  });

  addDataEndpoint('put', '/api/folder/:folderId', async (req, res, apiCache) => {
    const folderItemsStorage = await new PersistentStorage<SqluiCore.FolderItem>(
      'folders',
      req.params?.folderId,
    );

    res.status(202).json(
      await folderItemsStorage.update({
        id: req.body.id,
        name: req.body.name,
        type: req.body.type,
        data: req.body.data,
      }),
    );
  });

  // can be used to delete items off the recycle permanently
  addDataEndpoint('delete', '/api/folder/:folderId/:itemId', async (req, res, apiCache) => {
    const folderItemsStorage = await new PersistentStorage<SqluiCore.FolderItem>(
      'folders',
      req.params?.folderId,
    );

    res.status(202).json(await folderItemsStorage.delete(req.params?.itemId));
  });

  // debug endpoints
  addDataEndpoint('get', '/api/debug', async (req, res, apiCache) => {
    res.status(200).json(apiCache.json());
  });
}
