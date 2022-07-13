import { app, BrowserWindow, ipcMain, Menu, nativeTheme, shell } from 'electron';
import path from 'path';
import { matchPath } from 'react-router-dom';
import { getEndpointHandlers, setUpDataEndpoints } from 'src/common/Endpoints';
import { SqluiEnums } from 'typings';

const isMac = process.platform === 'darwin';

function createWindow() {
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

  // and load the index.html of the app.
  mainWindow.loadFile('index.html');

  // Open the DevTools.
  if (process.env.ENV_TYPE === 'electron-dev') {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

function sendMessage(win: BrowserWindow, message: SqluiEnums.ClientEventKey) {
  if (win) {
    win.webContents.send('sqluiNativeEvent/ipcElectronCommand', message, {});
  }
}

function setupMenu() {
  let menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: isMac ? 'Cmd+Shift+N' : 'Ctrl+Shift+N',
          click: async () => {
            const mainWindow = createWindow();

            const newWindowHandler = () => {
              setTimeout(() => sendMessage(mainWindow, 'clientEvent/session/switch'), 1500)
              mainWindow.webContents.removeListener('dom-ready', newWindowHandler);
            };

            mainWindow.webContents.on('dom-ready', newWindowHandler);
          },
        },
        {
          type: 'separator',
        },
        {
          id: 'menu-connection-new',
          label: 'New Connection',
          accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
          click: async (item, win) =>
            sendMessage(win as BrowserWindow, 'clientEvent/connection/new'),
        },
        {
          type: 'separator',
        },
        {
          id: 'menu-import',
          label: 'Import',
          accelerator: isMac ? 'Cmd+O' : 'Ctrl+O',
          click: async (item, win) => sendMessage(win as BrowserWindow, 'clientEvent/import'),
        },
        {
          id: 'menu-export',
          label: 'Export',
          accelerator: isMac ? 'Cmd+S' : 'Ctrl+S',
          click: async (item, win) => sendMessage(win as BrowserWindow, 'clientEvent/exportAll'),
        },
        {
          type: 'separator',
        },
        {
          label: 'Settings',
          click: async (item, win) => sendMessage(win as BrowserWindow, 'clientEvent/showSettings'),
        },
        {
          type: 'separator',
        },
        isMac ? { role: 'close', accelerator: 'Cmd+Q' } : { role: 'quit', accelerator: 'Alt+F4' },
      ],
    },
    {
      label: 'Query',
      submenu: [
        {
          id: 'menu-query-new',
          label: 'New Query',
          accelerator: isMac ? 'Cmd+T' : 'Ctrl+T',
          click: async (item, win) => sendMessage(win as BrowserWindow, 'clientEvent/query/new'),
        },
        {
          id: 'menu-query-rename',
          label: 'Rename Query',
          accelerator: 'F2',
          click: async (item, win) => sendMessage(win as BrowserWindow, 'clientEvent/query/rename'),
        },
        {
          id: 'menu-query-help',
          label: 'Query Help',
          click: async (item, win) =>
            sendMessage(win as BrowserWindow, 'clientEvent/showQueryHelp'),
        },
        {
          type: 'separator',
        },
        {
          id: 'menu-query-prev',
          label: 'Prev Query',
          accelerator: isMac ? 'Cmd+Shift+[' : 'Alt+Shift+[',
          click: async (item, win) =>
            sendMessage(win as BrowserWindow, 'clientEvent/query/showPrev'),
        },
        {
          id: 'menu-query-next',
          label: 'Next Query',
          accelerator: isMac ? 'Cmd+Shift+]' : 'Alt+Shift+]',
          click: async (item, win) =>
            sendMessage(win as BrowserWindow, 'clientEvent/query/showNext'),
        },
        {
          type: 'separator',
        },
        {
          id: 'menu-query-close',
          label: 'Close Query',
          accelerator: isMac ? 'Cmd+W' : 'Ctrl+W',
          click: async (item, win) =>
            sendMessage(win as BrowserWindow, 'clientEvent/query/closeCurrentlySelected'),
        },
      ],
    },
    {
      label: 'Session',
      submenu: [
        {
          id: 'menu-session-rename',
          label: 'Rename Session',
          click: async (item, win) =>
            sendMessage(win as BrowserWindow, 'clientEvent/session/rename'),
        },
        {
          id: 'menu-session-switch',
          label: 'Switch Session',
          click: async (item, win) =>
            sendMessage(win as BrowserWindow, 'clientEvent/session/switch'),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        {
          role: 'zoomIn',
          accelerator: isMac ? 'Cmd+=' : 'Ctrl+=',
          visible: false,
          acceleratorWorksWhenHidden: true,
        },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          id: 'menu-session-switch',
          label: 'Command Palette',
          accelerator: isMac ? 'Cmd+P' : 'Ctrl+P',
          visible: false,
          acceleratorWorksWhenHidden: true,
          click: async (item, win) =>
            sendMessage(win as BrowserWindow, 'clientEvent/showCommandPalette'),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'File a bug',
          click: async () => {
            await shell.openExternal('https://github.com/synle/sqlui-native/issues/new');
          },
        },
        {
          label: 'About / Check for update',
          click: async (item, win) =>
            sendMessage(win as BrowserWindow, 'clientEvent/checkForUpdate'),
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
  setUpDataEndpoints();
  createWindow();
  setupMenu();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// events

ipcMain.handle('dark-mode:toggle', () => {
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = 'light';
  } else {
    nativeTheme.themeSource = 'dark';
  }
  return nativeTheme.shouldUseDarkColors;
});

ipcMain.handle('dark-mode:system', () => {
  nativeTheme.themeSource = 'system';
});

ipcMain.on('sqluiNativeEvent/toggleMenus', (event, data) => {
  const [enabled, ...targetMenuIds] = data;
  // console.log('>> Toggle Menus', enabled, targetMenuIds);
  for (const targetMenuId of targetMenuIds) {
    try {
      //@ts-ignore
      let menuItem: any = Menu.getApplicationMenu().getMenuItemById(targetMenuId);
      menuItem.enabled = enabled;
    } catch (err) {
      console.log('>> Failed to toggle Menu', data, err);
    }
  }
});

// this is the event listener that will respond when we will request it in the web page
const _apiCache = {};
ipcMain.on('sqluiNativeEvent/fetch', async (event, data) => {
  const { requestId, url, options } = data;
  const responseId = `server response ${Date.now()}`;

  const method = (options.method || 'get').toLowerCase();

  const sessionId = options?.headers['sqlui-native-session-id'];

  let body: any = {};
  try {
    body = JSON.parse(options.body);
  } catch (err) {}

  console.log('>> Request', method, url, sessionId, body);
  let matchedUrlObject: any;
  const matchCurrentUrlAgainst = (matchAgainstUrl: string) => {
    try {
      return matchPath(matchAgainstUrl, url);
    } catch (err) {
      return undefined;
    }
  };

  try {
    let returnedResponseHeaders: any = []; // array of [key, value]
    const sendResponse = (responseData: any = '', status = 200) => {
      let ok = true;
      if (status >= 300 || status < 200) {
        ok = false;
      }
      console.log('>> Response', status, method, url, sessionId, body, responseData);
      event.reply(requestId, {
        ok,
        status,
        text: JSON.stringify(responseData),
        headers: returnedResponseHeaders,
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
      header: (key: string, value: string) => {
        returnedResponseHeaders.push([key, value]);
      },
    };

    const endpoints = getEndpointHandlers();
    for (const endpoint of endpoints) {
      const [targetMethod, targetUrl, targetHandler] = endpoint;
      const matchedUrlObject = matchCurrentUrlAgainst(targetUrl);
      if (targetMethod === method && matchedUrlObject) {
        const apiCache = {
          get(key: string) {
            try {
              //@ts-ignore
              return _apiCache[sessionId][key];
            } catch (err) {
              return undefined;
            }
          },
          set(key: string, value: any) {
            try {
              //@ts-ignore
              _apiCache[sessionId] = _apiCache[sessionId] || {};

              //@ts-ignore
              _apiCache[sessionId][key] = value;
            } catch (err) {}
          },
          json() {
            return JSON.stringify(_apiCache);
          },
        };

        const req = {
          params: matchedUrlObject?.params,
          body: body,
          headers: {
            ['sqlui-native-session-id']: sessionId,
          },
        };

        return targetHandler(req, res, apiCache);
      }
    }

    // not found, then return 404
    sendResponse('Resource Not Found...', 500);
  } catch (err) {
    console.log('error', err);
  }
});
