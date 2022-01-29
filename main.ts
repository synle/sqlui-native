// Modules to control application life and create native browser window
import {
  RelationalDatabaseEngine,
  getEngine,
  getConnectionMetaData,
} from './commons/utils/RelationalDatabaseEngine';
import ConnectionUtils from './commons/utils/ConnectionUtils';
import { Sqlui } from './typings';
import { matchPath } from 'react-router-dom';
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { setUpDataEndpoints, getEndpointHandlers } from './commons/utils/EndpointUtils';

setUpDataEndpoints();

const path = require('path');

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  if (process.env.ENV_TYPE === 'electron-dev') {
    mainWindow.webContents.openDevTools();
  }

  let menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Help',
      submenu: [
        { role: 'forceReload' },
        {
          label: 'About',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/synle/sqlui-native');
          },
        },
      ],
    },
  ];

  let menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
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
const _apiCache = {};

ipcMain.on('sqluiNativeEvent/fetch', async (event, data) => {
  const { requestId, url, options } = data;
  const responseId = `server response ${Date.now()}`;

  const method = (options.method || 'get').toLowerCase();

  let body: any = {};
  try {
    body = JSON.parse(options.body);
  } catch (err) {}

  console.log('>> Request', method, url, body);
  let matchedUrlObject: any;
  const matchCurrentUrlAgainst = (matchAgainstUrl: string) => {
    try {
      return matchPath(matchAgainstUrl, url);
    } catch (err) {
      return undefined;
    }
  };

  try {
    const sendResponse = (responseData: any = '', status = 200) => {
      let ok = true;
      if (status >= 300 || status < 200) {
        ok = false;
      }
      console.log('>> Response', status, method, url, body, responseData);
      event.reply(requestId, {
        ok,
        status,
        text: JSON.stringify(responseData),
      });
    };

    // polyfill for the express server interface
    const res = {
      status: (code: number) => {
        return {
          send: (msg: any) => {
            sendResponse(msg, code);
          },
          json: (returnedData: any) => {
            sendResponse(returnedData, code);
          },
        };
      },
    };

    const endpoints = getEndpointHandlers();
    for (const endpoint of endpoints) {
      const [targetMethod, targetUrl, targetHandler] = endpoint;
      const matchedUrlObject = matchCurrentUrlAgainst(targetUrl);
      if (targetMethod === method && matchedUrlObject) {
        const req = {
          params: matchedUrlObject?.params,
          body: body,
        };

        return targetHandler(req, res, _apiCache);
      }
    }

    // not found, then return 404
    sendResponse('Resource Not Found...', 500);
  } catch (err) {
    console.log('error', err);
  }
});
