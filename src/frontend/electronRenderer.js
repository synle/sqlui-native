// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.
try {
  /** @type {boolean} True when running inside Electron; false in browser/mocked-server mode. */
  window.isElectron = false;

  /**
   * Toggles Electron application menu items by name.
   * No-op in browser/mocked-server mode.
   * @param {boolean} visible - Whether to show or hide the menus.
   * @param {string|string[]} menus - Menu name(s) to toggle.
   */
  window.toggleElectronMenu = () => {};

  /**
   * Opens a URL in the system's default external browser.
   * In browser mode, opens the link in a new tab.
   * @param {string} link - The URL to open.
   */
  window.openBrowserLink = (link) => {
    window.open(link, "_blank");
  };

  /**
   * Navigates to an in-app hash route.
   * In browser mode, opens the hash route in the same origin.
   * @param {string} hashLink - The hash portion of the route (without the leading #).
   */
  window.openAppLink = (hashLink) => {
    window.open(`/#${hashLink}`);
  };

  if (window?.process?.env?.ENV_TYPE !== "mocked-server" && window.requireElectron) {
    const ipcRenderer = window.requireElectron("electron").ipcRenderer;
    const shell = window.requireElectron("electron").shell;

    window.ipcRenderer = ipcRenderer;
    window.isElectron = true;

    /**
     * Sends a toggle-menus IPC message to the Electron main process.
     * @param {boolean} visible - Whether to show or hide the menus.
     * @param {string|string[]} menus - Menu name(s) to toggle.
     */
    window.toggleElectronMenu = (visible, menus) => {
      menus = [].concat(menus);
      ipcRenderer.send("sqluiNativeEvent/toggleMenus", [visible, ...menus]);
    };

    /**
     * Opens a URL in the system's default browser via Electron's shell.
     * @param {string} link - The URL to open externally.
     */
    window.openBrowserLink = (link) => {
      shell.openExternal(link);
    };

    /**
     * Requests the Electron main process to open a new app window at the given hash route.
     * @param {string} hashLink - The hash portion of the route (without the leading #).
     */
    window.openAppLink = (hashLink) => {
      fetch(`/api/appWindow`, {
        method: "post",
        body: JSON.stringify({
          hashLink,
        }),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
    };

    // here we are polyfilling fetch with ipcRenderer
    const origFetch = window.fetch;

    /**
     * Fetch polyfill for Electron: routes /api/* requests through ipcRenderer instead of HTTP.
     * Non-/api requests fall through to the original window.fetch.
     * @param {string} url - The request URL.
     * @param {RequestInit} options - Standard fetch options (method, headers, body, etc.).
     * @returns {Promise<{ok: boolean, text: function(): string, headers: object}>} A fetch-compatible response object.
     */
    window.fetch = (url, options) => {
      if (url.indexOf("/api") !== 0) {
        // if not /api/, then use the original fetch
        return origFetch(url, options);
      }
      return new Promise((resolve, reject) => {
        const requestId = `fetch.requestId.${Date.now()}.${Math.floor(Math.random() * 10000000000000000)}`;
        ipcRenderer.once(requestId, (event, data) => {
          const { ok, text, status, headers } = data;

          let returnedData = text;

          try {
            returnedData = JSON.parse(text);
          } catch (err) {
            console.error("electronRenderer.js:parse", err);
          }

          console.log(
            ">> Network",
            ok ? "Success" : "Error:",
            status,
            options.method || "get",
            url,
            options.headers["sqlui-native-session-id"],
            returnedData,
          );

          resolve({
            ok,
            text: () => text,
            headers,
          });
        });
        ipcRenderer.send("sqluiNativeEvent/fetch", { requestId, url, options });
      });
    };
  }
} catch (err) {
  console.error("electronRenderer.js:send", err);
}
