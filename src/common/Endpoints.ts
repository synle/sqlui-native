import { BrowserWindow } from 'electron';
import { Express } from 'express';
import path from 'path';
import {
  getColumns,
  getConnectionMetaData,
  getDataAdapter,
  getDatabases,
  getTables,
} from 'src/common/adapters/DataAdapterFactory';
import {
  getConnectionsStorage,
  getFolderItemsStorage,
  getQueryStorage,
  getSessionsStorage,
  getDataSnapshotStorage,
  storageDir,
} from 'src/common/PersistentStorage';
import * as sessionUtils from 'src/common/utils/sessionUtils';
import { SqluiCore, SqluiEnums } from 'typings';
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
  // storageDir
  //=========================================================================
  // config api endpoints
  //=========================================================================
  addDataEndpoint('get', '/api/configs', async (req, res, apiCache) => {
    res.status(200).json({
      storageDir,
      isElectron: !expressAppContext,
    });
  });

  //=========================================================================
  // connection api endpoints
  //=========================================================================
  addDataEndpoint('get', '/api/connections', async (req, res, apiCache) => {
    const connectionsStorage = await getConnectionsStorage(req.headers['sqlui-native-session-id']);

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
    const connectionsStorage = await getConnectionsStorage(req.headers['sqlui-native-session-id']);

    const connections = await connectionsStorage.set(req.body);

    res.status(200).json(connections);
  });

  addDataEndpoint('get', '/api/connection/:connectionId', async (req, res, apiCache) => {
    const connectionsStorage = await getConnectionsStorage(req.headers['sqlui-native-session-id']);

    const connection = await connectionsStorage.get(req.params?.connectionId);

    try {
      const engine = getDataAdapter(connection.connection);
      await engine.authenticate();

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

  addDataEndpoint('get', '/api/connection/:connectionId/database/:databaseId', async (req, res) => {
    const databases = await getDatabases(
      req.headers['sqlui-native-session-id'],
      req.params?.connectionId,
    );
    const database = databases.find((db) => db.name === req.params?.databaseId);

    if (!database) {
      return res.status(404).send('Not Found');
    }

    res.status(200).json(database);
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
    const connectionsStorage = await getConnectionsStorage(req.headers['sqlui-native-session-id']);

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
      res.status(406).json(`Failed to connect ${err.toString()}`);
      console.log('Failed to connect', err);
    }
  });

  addDataEndpoint('post', '/api/connection/:connectionId/execute', async (req, res, apiCache) => {
    const connectionsStorage = await getConnectionsStorage(req.headers['sqlui-native-session-id']);

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

    const connectionsStorage = await getConnectionsStorage(req.headers['sqlui-native-session-id']);

    res.status(201).json(
      await connectionsStorage.add({
        connection: req.body?.connection,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint('put', '/api/connection/:connectionId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const connectionsStorage = await getConnectionsStorage(req.headers['sqlui-native-session-id']);

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

    const connectionsStorage = await getConnectionsStorage(req.headers['sqlui-native-session-id']);

    res.status(202).json(await connectionsStorage.delete(req.params?.connectionId));
  });
  //=========================================================================
  // query api endpoints
  //=========================================================================
  addDataEndpoint('get', '/api/queries', async (req, res, apiCache) => {
    const queryStorage = await getQueryStorage(req.headers['sqlui-native-session-id']);

    res.status(200).json(await queryStorage.list());
  });

  addDataEndpoint('post', '/api/query', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const queryStorage = await getQueryStorage(req.headers['sqlui-native-session-id']);

    res.status(201).json(
      await queryStorage.add({
        connection: req.body?.name,
      }),
    );
  });

  addDataEndpoint('put', '/api/query/:queryId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const queryStorage = await getQueryStorage(req.headers['sqlui-native-session-id']);

    res.status(202).json(
      await queryStorage.update({
        id: req.body.id,
        name: req.body.name,
        connectionId: req.body?.connectionId,
        databaseId: req.body?.databaseId,
        tableId: req.body?.tableId,
        sql: req.body?.sql,
      }),
    );
  });

  addDataEndpoint('delete', '/api/query/:queryId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const queryStorage = await getQueryStorage(req.headers['sqlui-native-session-id']);

    res.status(202).json(await queryStorage.delete(req.params?.queryId));
  });
  //=========================================================================
  // session api endpoints
  //=========================================================================
  // get the current session
  addDataEndpoint('get', '/api/session', async (req, res, apiCache) => {
    const windowId = req.headers['sqlui-native-window-id'];
    if (!windowId) {
      // windowId is required
      return res.status(404).json(null);
    }

    let sessionId = await sessionUtils.getByWindowId(windowId);
    if (!sessionId) {
      return res.status(404).json(null);
    }

    const sessionsStorage = await getSessionsStorage();

    const session = await sessionsStorage.get(sessionId);

    // TODO see if we need to start over with a new session
    if (!session) {
      return res.status(404).json(null);
    }

    res.status(200).json(session);
  });

  addDataEndpoint('get', '/api/sessions', async (req, res, apiCache) => {
    const sessionsStorage = await getSessionsStorage();

    res.status(200).json(await sessionsStorage.list());
  });

  addDataEndpoint('get', '/api/sessions/opened', async (req, res, apiCache) => {
    res.status(200).json(await sessionUtils.listSessionIds());
  });

  addDataEndpoint('post', '/api/sessions/opened/:sessionId', async (req, res, apiCache) => {
    const windowId = req.headers['sqlui-native-window-id'];
    if (!windowId) {
      throw 'windowId is required';
    }

    const newSessionId = req.params?.sessionId;
    const isNewSessionId = await sessionUtils.open(windowId, newSessionId);

    if (isNewSessionId) {
      // created
      res.status(201).json({
        outcome: 'create_new_session',
      });
    } else {
      // accepted
      res.status(202).json({
        outcome: 'focus_on_old_session_id',
      });
    }
  });

  addDataEndpoint('post', '/api/session', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const sessionsStorage = await getSessionsStorage();

    res.status(201).json(
      await sessionsStorage.add({
        connection: req.body?.name,
      }),
    );
  });

  addDataEndpoint('put', '/api/session/:sessionId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const sessionsStorage = await getSessionsStorage();

    res.status(202).json(
      await sessionsStorage.update({
        id: req.params?.sessionId,
        name: req.body?.name,
      }),
    );
  });

  addDataEndpoint('post', '/api/session/:sessionId/clone', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const name = req.body?.name;
    const clonedFromSessionId = req.params?.sessionId;

    if (!name) {
      return res.status(400).send('`name` is required...');
    }
    const sessionsStorage = await getSessionsStorage();

    const newSession = await sessionsStorage.add({
      name,
    });

    const newSessionId = newSession.id;

    // get a list of connections and queries from the old session
    const connectionsStorage = await getConnectionsStorage(clonedFromSessionId);
    const connections = await connectionsStorage.list();

    const queryStorage = await getQueryStorage(clonedFromSessionId);
    const queries = await queryStorage.list();

    // here's the copy and clone of connections and queries
    const newConnectionsStorage = await getConnectionsStorage(newSessionId);
    const newQueryStorage = await getQueryStorage(newSessionId);
    await newConnectionsStorage.set(connections);
    await newQueryStorage.set(queries);

    res.status(201).json(newSession);
  });

  addDataEndpoint('delete', '/api/session/:sessionId', async (req, res, apiCache) => {
    apiCache.set('serverCacheKey/cacheMetaData', null);

    const sessionIdToDelete = req.params?.sessionId;
    if (!sessionIdToDelete) {
      throw 'sessionId is required';
    }

    const sessionsStorage = await getSessionsStorage();

    // delete it
    const response = await sessionsStorage.delete(sessionIdToDelete);

    // close the targeted windowId
    // if there's a matching window, let's close it
    await sessionUtils.close(await sessionUtils.getWindowIdBySessionId(sessionIdToDelete));

    res.status(202).json(response);
  });
  //=========================================================================
  // folder items endpoints used in bookmarks and recycle bin
  //=========================================================================
  // this get a list of all items in a folder
  addDataEndpoint('get', '/api/folder/:folderId', async (req, res, apiCache) => {
    const folderItemsStorage = await getFolderItemsStorage(req.params?.folderId);

    res.status(200).json(await folderItemsStorage.list());
  });

  // adds item to recycle bin
  addDataEndpoint('post', '/api/folder/:folderId', async (req, res, apiCache) => {
    const folderItemsStorage = await getFolderItemsStorage(req.params?.folderId);

    res.status(202).json(
      await folderItemsStorage.add({
        name: req.body.name,
        type: req.body.type,
        data: req.body.data,
      }),
    );
  });

  addDataEndpoint('put', '/api/folder/:folderId', async (req, res, apiCache) => {
    const folderItemsStorage = await getFolderItemsStorage(req.params?.folderId);

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
    const folderItemsStorage = await getFolderItemsStorage(req.params?.folderId);

    res.status(202).json(await folderItemsStorage.delete(req.params?.itemId));
  });

  // debug endpoints
  addDataEndpoint('get', '/api/debug', async (req, res, apiCache) => {
    res.status(200).json(apiCache.json());
  });


  // data snapshot endpoints
  addDataEndpoint('get', '/api/dataSnapshot', async (req, res) => {
    const dataSnapshotStorage = await getDataSnapshotStorage();

     // here we skip the description to save spaces
    const dataSnapshots = (await dataSnapshotStorage.list()).map(dataSnapshot => {
      const {description, ...restOfDataSnapshot} = dataSnapshot;
      return {
        ...restOfDataSnapshot
      };
    });

    res.status(200).json(dataSnapshots);
  });

  addDataEndpoint('get', '/api/dataSnapshot/:dataSnapshotId', async (req, res) => {
    const dataSnapshotStorage = await getDataSnapshotStorage();

    const dataSnapshotId = req.params?.dataSnapshotId;

    const dataSnapshot = await dataSnapshotStorage.get(dataSnapshotId);

    if (!dataSnapshot) {
      return res.status(404).send('Not Found');
    }
    res.status(200).json(dataSnapshot);
  });

  addDataEndpoint('post', '/api/dataSnapshot', async (req, res) => {
    const dataSnapshotStorage = await getDataSnapshotStorage();

    const dataSnapshotId = req.params?.dataSnapshotId;
    const resp = await dataSnapshotStorage.add({
      description: req.body.description,
      values: req.body.values,
      created : Date.now(),
    })
    res.status(200).json(resp);

    // attempting to open the window to show this data
    try {
      const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: __dirname + '/build/favicon.ico',
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: true,
          contextIsolation: false,
        },
      });

      mainWindow.loadFile(global.indexHtmlPath, { hash: `/data-snapshot/${dataSnapshotId}` });
    } catch (err) {}
  });

  addDataEndpoint('delete', '/api/dataSnapshot/:dataSnapshotId', async (req, res, apiCache) => {
    const dataSnapshotStorage = await getDataSnapshotStorage();
    res.status(202).json(await dataSnapshotStorage.delete(req.params?.dataSnapshotId));
  });
}
