/** Tauri sidecar platform implementation.
 * In this hybrid architecture, the backend is a Node.js Express server
 * (sidecar) — API calls go over HTTP, not Tauri invoke.
 * Tauri provides the desktop shell (menus, native browser open, etc.).
 */
import type { PlatformBridge } from "src/frontend/platform/types";

/** Resolved sidecar base URL. Set during platform initialization. */
let resolvedBaseUrl = "";

/** Initializes the Tauri platform by resolving the sidecar port.
 * Must be called once before the app renders.
 */
export async function initTauriPlatform(): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const port: number = await invoke("get_sidecar_port");
    if (port !== 0) {
      resolvedBaseUrl = `http://127.0.0.1:${port}`;
      console.log(`Tauri sidecar connected on port ${port}`);
    } else {
      console.log("Tauri dev mode: using Vite proxy for API calls");
    }
  } catch (err) {
    console.error("platform/tauri.ts:initTauriPlatform", err);
  }
}

/** Tauri platform bridge for Tauri desktop shell with Node.js sidecar backend. */
export const tauriPlatform: PlatformBridge = {
  isDesktop: true,
  isTauri: true,

  get sidecarBaseUrl() {
    return resolvedBaseUrl;
  },

  openExternalUrl(url: string) {
    import("@tauri-apps/plugin-opener")
      .then(({ openUrl }) => openUrl(url))
      .catch(() => window.open(url, "_blank"));
  },

  openAppWindow(hashLink: string) {
    window.location.hash = hashLink;
  },

  toggleMenuItems(_visible: boolean, _menuIds: string[]) {
    // Menus are handled by Rust — no toggling needed from JS
  },

  readFileContent(file: File): Promise<string> {
    // Use the sidecar's /api/file endpoint (same as browser fallback)
    const form = new FormData();
    form.append("file", file);
    const baseUrl = resolvedBaseUrl;
    return fetch(`${baseUrl}/api/file`, {
      method: "POST",
      body: form,
    }).then((r) => r.text());
  },

  executeShellCommand(command: string): Promise<string> {
    return import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke<string>("execute_shell", { command }))
      .catch(() => "");
  },

  getFilePath(_file: File): string | null {
    // Tauri WebView doesn't expose filesystem paths for File objects
    return null;
  },

  onAppCommand(callback: (event: string) => void): () => void {
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<string>("menu-command", (event) => {
        callback(event.payload);
      }).then((fn) => {
        unlisten = fn;
      });
    });
    return () => {
      if (unlisten) unlisten();
    };
  },
};
