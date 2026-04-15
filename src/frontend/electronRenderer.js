// This file bridges the frontend with either the Tauri shell or a plain browser environment.
// It replaces the previous Electron-specific polyfills (IPC fetch, shell, menus).

/**
 * Initializes the application bridge for either Tauri or browser mode.
 * In Tauri mode, resolves the sidecar port and sets up native shell helpers.
 * In browser/dev mode, uses standard browser APIs with relative URLs.
 * Must be called and awaited before the app renders.
 * @returns {Promise<void>}
 */
window.initApp = async function initApp() {
  try {
    // Defaults for browser / mocked-server mode
    window.isElectron = false;
    window.isTauri = false;
    window.__SIDECAR_BASE_URL__ = "";

    /**
     * Toggles native menu items. No-op — menus are handled by Tauri/Rust.
     */
    window.toggleElectronMenu = () => {};

    /**
     * Opens a URL in the system's default browser.
     * @param {string} link - The URL to open.
     */
    window.openBrowserLink = (link) => {
      window.open(link, "_blank");
    };

    /**
     * Navigates to an in-app hash route.
     * @param {string} hashLink - The hash portion of the route.
     */
    window.openAppLink = (hashLink) => {
      window.open(`/#${hashLink}`);
    };

    // Detect Tauri environment
    if (window.__TAURI_INTERNALS__) {
      window.isTauri = true;

      try {
        const { invoke } = await import("@tauri-apps/api/core");

        // Get the sidecar Express server port from Rust.
        // Port 0 means dev mode (`tauri dev`): the mocked server runs on port 3001
        // and the Vite dev server at port 3000 proxies /api calls to it.
        // In that case, leave __SIDECAR_BASE_URL__ empty so relative URLs are used.
        const port = await invoke("get_sidecar_port");
        if (port !== 0) {
          window.__SIDECAR_BASE_URL__ = `http://127.0.0.1:${port}`;
          console.log(`Tauri sidecar connected on port ${port}`);
        } else {
          console.log("Tauri dev mode: using Vite proxy for API calls");
        }
      } catch (err) {
        console.error("electronRenderer.js:initApp:sidecar", err);
      }

      /**
       * Opens a URL in the system's default browser via Tauri's shell plugin.
       * @param {string} link - The URL to open externally.
       */
      window.openBrowserLink = async (link) => {
        try {
          const { open } = await import("@tauri-apps/plugin-opener");
          await open(link);
        } catch (err) {
          console.error("electronRenderer.js:openBrowserLink", err);
          window.open(link, "_blank");
        }
      };

      /**
       * Opens an in-app hash route in the current window.
       * @param {string} hashLink - The hash portion of the route.
       */
      window.openAppLink = (hashLink) => {
        window.location.hash = hashLink;
      };
    }
  } catch (err) {
    console.error("electronRenderer.js:initApp", err);
  }
};
