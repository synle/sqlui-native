// Modules to control application life and create native browser window
import {
  RelationalDatabaseEngine,
  getEngine,
  getConnectionMetaData,
} from './commons/utils/RelationalDatabaseEngine';
import ConnectionUtils from './commons/utils/ConnectionUtils';
import { Sqlui } from './typings';
const { app, BrowserWindow } = require('electron');
const { ipcMain } = require('electron'); // used to communicate asynchronously from the main process to renderer processes.
const ipcRenderer = require('electron').ipcRenderer;
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

let cacheMetaData: any;

ipcMain.on('sqluiNative/fetch', async (event, data) => {
  const { requestId, url, options } = data;
  const responseId = `server response ${Date.now()}`;

  const {method} = (options.method || 'get').toLowerCase();

  try{
    const sendResponse = (responseData: any) => {
    console.log('send response', responseData)
      event.reply(requestId, {
      ok: true,
      text: JSON.stringify(responseData),
    });
  }

  if(url.includes('/api/metadata')){

    //core api
    const connections = await ConnectionUtils.getConnections();

    if (cacheMetaData) {
      return sendResponse(cacheMetaData);
    }

    const resp: Sqlui.CoreConnectionMetaData[] = [];

    for (const connection of connections) {
      resp.push(await getConnectionMetaData(connection));
    }

    cacheMetaData = resp;
    sendResponse(cacheMetaData);
  } else {
    setTimeout(() => {
      event.reply(data.requestId, {
        ok: true,
        response: `server response ${Date.now()}`,
        request: JSON.stringify(data),
        body: data,
      });
    }, 3000);
  }
} catch(err){
  console.log('error', err)
}
});
