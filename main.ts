// Modules to control application life and create native browser window
import {
  RelationalDatabaseEngine,
  getEngine,
  getConnectionMetaData,
} from './commons/utils/RelationalDatabaseEngine';
import ConnectionUtils from './commons/utils/ConnectionUtils';
import { Sqlui } from './typings';
import { matchPath } from 'react-router-dom';
import { app, BrowserWindow, ipcMain } from 'electron';
const path = require('path');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'build/preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile('build/index.html');

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// events
// this is the event listener that will respond when we will request it in the web page
ipcMain.on('sqluiNativeEvent/fetch', async (event, data) => {
  const { requestId, url, options } = data;
  const responseId = `server response ${Date.now()}`;

  const method = (options.method || 'get').toLowerCase();

  let body: any = {};
  try {
    body = JSON.parse(options.body);
  } catch (err) {}

  console.log('>> received request', method, url, body);
  let matchedUrlObject: any;
  const matchCurrentUrlAgainst = (matchAgainstUrl) => {
    matchedUrlObject = matchPath(matchAgainstUrl, url);
    return matchedUrlObject;
  };

  try {
    const sendResponse = (responseData: any = '', ok = true) => {
      console.log('>> send response', method, url, body, responseData);
      event.reply(requestId, {
        ok,
        text: JSON.stringify(responseData),
      });
    };

    if (matchCurrentUrlAgainst('/api/metadata')) {
      const resp: Sqlui.CoreConnectionMetaData[] = [];
      const connections = await ConnectionUtils.getConnections();
      for (const connection of connections) {
        resp.push(await getConnectionMetaData(connection));
      }
      return sendResponse(resp);
    } else if (matchCurrentUrlAgainst('/api/connection') && method === 'post') {
      return sendResponse(
        await ConnectionUtils.addConnection({ connection: body?.connection, name: body?.name }),
      );
    } else if (matchCurrentUrlAgainst('/api/connection/:connectionId') && method === 'put') {
      return sendResponse(
        await ConnectionUtils.updateConnection({
          id: matchedUrlObject?.params?.connectionId,
          connection: body?.connection,
          name: body?.name,
        }),
      );
    } else if (matchCurrentUrlAgainst('/api/connection/:connectionId') && method === 'delete') {
      return sendResponse(
        await ConnectionUtils.deleteConnection(matchedUrlObject?.params?.connectionId),
      );
    } else if (matchCurrentUrlAgainst('/api/connection/:connectionId/execute') && method === 'post') {
      try {
        const connection = await ConnectionUtils.getConnection(matchedUrlObject?.params?.connectionId);
        const engine = getEngine(connection.connection);
        const sql = body?.sql;
        const database = body?.database;
        return sendResponse(await engine.execute(sql, database));
      } catch (err) {
        sendResponse(`500 Server Error... ${err}`, false);
      }
    } else if (matchCurrentUrlAgainst('/api/connection/:connectionId/connect') && method === 'post') {
      try {
        const connection = await ConnectionUtils.getConnection(matchedUrlObject?.params?.connectionId);
        const engine = getEngine(connection.connection);
        return sendResponse(await getConnectionMetaData(connection));
      } catch (err) {
        sendResponse(`500 Server Error... ${err}`, false);
      }
    } else if (matchCurrentUrlAgainst('/api/connection/test') && method === 'post') {
      try {
        const connection: Sqlui.CoreConnectionProps = body;
        const engine = getEngine(connection.connection);
        await engine.authenticate();
        sendResponse(await getConnectionMetaData(connection));
      } catch (err) {
        sendResponse(`500 Server Error... ${err}`, false);
      }
    }

    // not found, then return 404
    sendResponse('404 Resource Not Found...', false);
  } catch (err) {
    console.log('error', err);
  }
});
