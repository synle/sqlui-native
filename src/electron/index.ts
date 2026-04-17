import { app, BrowserWindow, ipcMain, Menu, nativeTheme, session, shell } from "electron";
import express from "express";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { writeDebugLog } from "src/common/utils/debugLogger";
import { app as expressApp, initializeEndpoints } from "src/sqlui-server/server";
import { SqluiEnums } from "typings";

/** Whether the current platform is macOS. */
const isMac = process.platform === "darwin";

/** Whether this is dev mode with a Vite dev server. */
const isDevMode = !!process?.env?.VITE_DEV_SERVER_URL;

/** Base URL for loading the frontend (set after server starts or from VITE_DEV_SERVER_URL). */
let serverBaseUrl: string;

/** HTTP server instance for graceful shutdown. */
let httpServer: ReturnType<typeof expressApp.listen> | undefined;

writeDebugLog(
  `app:init - platform=${process.platform} arch=${process.arch} electron=${process.versions.electron} node=${process.versions.node} pid=${process.pid}`,
);

// prevent process crashes from unhandled connection errors (e.g. mariadb timeout)
process.on("uncaughtException", (err) => {
  const msg = err?.message || err;
  console.error("Uncaught Exception:", msg);
  writeDebugLog(`app:uncaughtException - ${msg}\n${err?.stack || ""}`);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  writeDebugLog(`app:unhandledRejection - ${reason}`);
});

// performance: disable smooth scrolling
try {
  app.commandLine.appendSwitch("disable-smooth-scrolling", "1");
  app.commandLine.appendSwitch("enable-smooth-scrolling", "0");
} catch (err) {
  console.error("index.ts:appendSwitch", err);
}

// performance: GPU acceleration and rendering
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-features", "CanvasOopRasterization,BackForwardCache");

// performance: reduce memory overhead
app.commandLine.appendSwitch("js-flags", "--expose-gc");

/**
 * Creates and returns the main Electron BrowserWindow, loading the server URL.
 * @returns The created BrowserWindow instance.
 */
async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: __dirname + "/favicon.ico",
    show: false, // performance: avoid white flash, show on ready-to-show
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#1e1e1e" : "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
      spellcheck: false, // performance: no spellcheck needed for SQL editor
      backgroundThrottling: false, // performance: keep queries running when window is in background
      v8CacheOptions: "bypassHeatCheck", // performance: aggressively cache compiled JS bytecode
    },
  });

  mainWindow.on("ready-to-show", () => {
    writeDebugLog("app:window - ready-to-show, displaying window");
    mainWindow.show();
  });

  // Catch renderer process crashes and log them instead of silently dying
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    writeDebugLog(`app:renderer-crash - reason=${details.reason} exitCode=${details.exitCode}`);
    console.error("Renderer process gone:", details);
  });

  mainWindow.on("unresponsive", () => {
    writeDebugLog("app:window - unresponsive");
  });

  // load the app: in dev mode use the Vite URL, otherwise load from file
  if (isDevMode) {
    mainWindow.loadURL(serverBaseUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "index.html"));
  }

  // Open the DevTools.
  if (process?.env?.ENV_TYPE === "electron-dev") {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

/**
 * Sends a client event message to a BrowserWindow via IPC.
 * @param win - The target BrowserWindow.
 * @param message - The client event key to dispatch.
 */
function sendMessage(win: BrowserWindow, message: SqluiEnums.ClientEventKey) {
  if (win) {
    win.webContents.send("sqluiNativeEvent/ipcElectronCommand", message, {});
  }
}

/**
 * Builds and sets the native application menu with File, Query, Session, Edit, and Help items.
 */
function setupMenu() {
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: isMac ? "Cmd+Shift+N" : "Ctrl+Shift+N",
          click: async () => {
            const mainWindow = await createWindow();

            const newWindowHandler = () => {
              setTimeout(() => {
                sendMessage(mainWindow, "clientEvent/session/switch");
                mainWindow.webContents.executeJavaScript(`
                  console.log('Asking window to show switch session');
                `);
              }, 1500);
              mainWindow.webContents.removeListener("dom-ready", newWindowHandler);
            };

            mainWindow.webContents.on("dom-ready", newWindowHandler);
          },
        },
        {
          type: "separator",
        },
        {
          id: "menu-connection-new",
          label: "New Connection",
          accelerator: isMac ? "Cmd+N" : "Ctrl+N",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/connection/new"),
        },
        {
          type: "separator",
        },
        {
          id: "menu-import",
          label: "Import",
          accelerator: isMac ? "Cmd+O" : "Ctrl+O",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/import"),
        },
        {
          id: "menu-export",
          label: "Export",
          accelerator: isMac ? "Cmd+S" : "Ctrl+S",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/exportAll"),
        },
        {
          type: "separator",
        },
        {
          label: "Settings",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/showSettings"),
        },
        {
          type: "separator",
        },
        isMac ? { role: "close", accelerator: "Cmd+Q" } : { role: "quit", accelerator: "Alt+F4" },
      ],
    },
    {
      label: "Query",
      submenu: [
        {
          id: "menu-query-new",
          label: "New Query",
          accelerator: isMac ? "Cmd+T" : "Ctrl+T",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/query/new"),
        },
        {
          id: "menu-query-rename",
          label: "Rename Query",
          accelerator: "F2",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/query/rename"),
        },
        {
          id: "menu-query-help",
          label: "Query Help",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/showQueryHelp"),
        },
        {
          type: "separator",
        },
        {
          id: "menu-query-prev",
          label: "Prev Query",
          accelerator: isMac ? "Cmd+Shift+[" : "Alt+Shift+[",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/query/showPrev"),
        },
        {
          id: "menu-query-next",
          label: "Next Query",
          accelerator: isMac ? "Cmd+Shift+]" : "Alt+Shift+]",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/query/showNext"),
        },
        {
          type: "separator",
        },
        {
          id: "menu-query-close",
          label: "Close Query",
          accelerator: isMac ? "Cmd+W" : "Ctrl+W",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/query/closeCurrentlySelected"),
        },
      ],
    },
    {
      label: "Session",
      submenu: [
        {
          id: "menu-session-new",
          label: "New Session",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/session/new"),
        },
        {
          id: "menu-session-rename",
          label: "Rename Session",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/session/rename"),
        },
        {
          id: "menu-session-switch",
          label: "Switch Session",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/session/switch"),
        },
        {
          type: "separator",
        },
        {
          id: "menu-session-delete",
          label: "Delete Session",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/session/delete"),
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
        { type: "separator" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        {
          role: "zoomIn",
          accelerator: isMac ? "Cmd+=" : "Ctrl+=",
          visible: false,
          acceleratorWorksWhenHidden: true,
        },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        {
          id: "menu-session-switch",
          label: "Command Palette",
          accelerator: isMac ? "Cmd+P" : "Ctrl+P",
          visible: false,
          acceleratorWorksWhenHidden: true,
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/showCommandPalette"),
        },
        {
          id: "menu-toggle-sidebar",
          label: "Toggle Sidebar",
          accelerator: isMac ? "Cmd+\\" : "Alt+\\",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/toggleSidebar"),
        },
        {
          id: "menu-schema-search",
          label: "Search Schema",
          accelerator: isMac ? "Cmd+Shift+F" : "Ctrl+Shift+F",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/schema/search"),
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "File a bug",
          click: async () => {
            await shell.openExternal("https://github.com/synle/sqlui-native/issues/new");
          },
        },
        {
          label: "About sqlui-native (Check for update)",
          click: async (...[, win]) => sendMessage(win as BrowserWindow, "clientEvent/checkForUpdate"),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

/**
 * Starts the embedded Express server on a dynamic port bound to 127.0.0.1.
 * Registers API endpoints and serves static frontend files.
 * @returns Promise that resolves with the server base URL.
 */
function startEmbeddedServer(): Promise<string> {
  return new Promise((resolve, reject) => {
    initializeEndpoints();

    httpServer = expressApp.listen(0, "127.0.0.1", () => {
      const addr = httpServer!.address() as AddressInfo;
      const url = `http://127.0.0.1:${addr.port}`;
      writeDebugLog(`app:server - embedded server started on ${url}`);
      console.log(`Embedded server started on ${url} (pid: ${process.pid})`);

      // store base URL for appWindow endpoint to create new windows
      (global as any).serverBaseUrl = url;

      resolve(url);
    });

    httpServer.on("error", (err: NodeJS.ErrnoException) => {
      writeDebugLog(`app:server - failed to start: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Gracefully shuts down the embedded HTTP server.
 */
function shutdownServer(): void {
  if (httpServer) {
    httpServer.close();
    httpServer = undefined;
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  if (isDevMode) {
    // Dev mode: Vite dev server + external sqlui-server handle everything
    serverBaseUrl = process.env.VITE_DEV_SERVER_URL!;
    writeDebugLog(`app:ready - dev mode, loading ${serverBaseUrl}`);
  } else {
    // Production: embed the Express server
    writeDebugLog("app:ready - starting embedded server");
    serverBaseUrl = await startEmbeddedServer();

    // Redirect file:///api/* requests to the embedded HTTP server.
    // This allows the renderer (loaded from file://) to use relative /api/ paths.
    session.defaultSession.webRequest.onBeforeRequest({ urls: ["file:///api/*"] }, (details, callback) => {
      const url = new URL(details.url);
      callback({ redirectURL: `${serverBaseUrl}${url.pathname}${url.search}` });
    });
  }

  writeDebugLog("app:ready - creating window");
  await createWindow();
  writeDebugLog("app:ready - setting up menu");
  setupMenu();
  writeDebugLog("app:ready - initialization complete");

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  writeDebugLog("app:window-all-closed - quitting");
  shutdownServer();
  app.quit();
});

app.on("before-quit", () => {
  shutdownServer();
});

process.on("SIGTERM", () => {
  shutdownServer();
  app.quit();
});

process.on("SIGINT", () => {
  shutdownServer();
  app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
// events
ipcMain.handle("dark-mode:toggle", () => {
  if (nativeTheme.shouldUseDarkColors) {
    nativeTheme.themeSource = "light";
  } else {
    nativeTheme.themeSource = "dark";
  }
  return nativeTheme.shouldUseDarkColors;
});

ipcMain.handle("dark-mode:system", () => {
  nativeTheme.themeSource = "system";
});

ipcMain.on("sqluiNativeEvent/toggleMenus", (...[, data]) => {
  const [enabled, ...targetMenuIds] = data;
  // console.log('>> Toggle Menus', enabled, targetMenuIds);
  for (const targetMenuId of targetMenuIds) {
    try {
      //@ts-ignore
      const menuItem: any = Menu.getApplicationMenu().getMenuItemById(targetMenuId);
      menuItem.enabled = enabled;
    } catch (err) {
      console.error("index.ts:toggleMenu", data, err);
    }
  }
});
