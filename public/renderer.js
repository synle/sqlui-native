// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
try {
  window.isElectron = false;
  window.toggleElectronMenu = () => {};

  if (process.env.ENV_TYPE !== 'mocked-server') {
    const ipcRenderer = require('electron').ipcRenderer;
    window.ipcRenderer = ipcRenderer;
    window.isElectron = true;
    window.toggleElectronMenu = (visible, menus) => {
      menus = [].concat(menus);
      ipcRenderer.send('sqluiNativeEvent/toggleMenus', [visible, ...menus]);
    };

    // here we are polyfilling fetch with ipcRenderer
    const origFetch = window.fetch;
    window.fetch = (url, options) => {
      if (url.indexOf('/api') !== 0) {
        // if not /api/, then use the original fetch
        return origFetch(url, options);
      }
      return new Promise((resolve, reject) => {
        const requestId = `fetch.requestId.${Date.now()}.${Math.floor(
          Math.random() * 10000000000000000,
        )}`;
        ipcRenderer.once(requestId, (event, data) => {
          const { ok, text, status, headers } = data;

          let returnedData = text;

          try {
            returnedData = JSON.parse(text);
          } catch (err) {}

          console.log(
            '>> Network',
            ok ? 'Success' : 'Error:',
            status,
            options.method || 'get',
            url,
            options.headers['sqlui-native-session-id'],
            returnedData,
            headers,
          );

          resolve({
            ok,
            text: () => text,
            headers,
          });
        });
        ipcRenderer.send('sqluiNativeEvent/fetch', { requestId, url, options });
      });
    };
  }
} catch (err) {}
