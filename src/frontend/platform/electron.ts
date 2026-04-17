/** Electron platform implementation using IPC for shell integration.
 * All window.requireElectron / window.ipcRenderer access is encapsulated here.
 * API calls use standard HTTP fetch (no IPC polyfill needed — the embedded server handles them).
 */
import type { PlatformBridge } from "src/frontend/platform/types";

/** Safe accessor for Electron's require (exposed via preload as window.requireElectron). */
function electronRequire(module: string): any {
  return (window as any).requireElectron(module);
}

/** Lazily-resolved Electron modules. */
let ipcRenderer: any;
let shell: any;

/** Initializes Electron IPC modules for shell integration (menus, commands, file access). */
export function initElectronPlatform(): void {
  try {
    const electron = electronRequire("electron");
    ipcRenderer = electron.ipcRenderer;
    shell = electron.shell;

    // Store ipcRenderer on window for ElectronEventListener backward compat
    (window as any).ipcRenderer = ipcRenderer;
  } catch (err) {
    console.error("platform/electron.ts:initElectronPlatform", err);
  }
}

export const electronPlatform: PlatformBridge = {
  isDesktop: true,

  openExternalUrl(url: string) {
    try {
      shell.openExternal(url);
    } catch (_err) {
      window.open(url, "_blank");
    }
  },

  openAppWindow(hashLink: string) {
    fetch("/api/appWindow", {
      method: "post",
      body: JSON.stringify({ hashLink }),
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
  },

  toggleMenuItems(visible: boolean, menuIds: string[]) {
    try {
      const menus = ([] as string[]).concat(menuIds);
      ipcRenderer.send("sqluiNativeEvent/toggleMenus", [visible, ...menus]);
    } catch (_err) {
      // not in Electron
    }
  },

  readFileContent(file: File): Promise<string> {
    try {
      const fs = electronRequire("fs");
      const { webUtils } = electronRequire("electron");
      const filePath = webUtils.getPathForFile(file);
      return Promise.resolve(fs.readFileSync(filePath, { encoding: "utf-8" }));
    } catch (_err) {
      const form = new FormData();
      form.append("file", file);
      return fetch("/api/file", { method: "POST", body: form }).then((r) => r.text());
    }
  },

  executeShellCommand(command: string): Promise<string> {
    try {
      const { exec } = electronRequire("child_process");
      return new Promise((resolve, reject) => {
        exec(command, (error: any, stdout: string, stderr: string) => {
          if (error) return reject(stderr);
          resolve(stdout);
        });
      });
    } catch (_err) {
      return Promise.resolve("");
    }
  },

  getFilePath(file: File): string | null {
    try {
      const { webUtils } = electronRequire("electron");
      return webUtils.getPathForFile(file) || null;
    } catch (_err) {
      return null;
    }
  },

  onAppCommand(callback: (event: string) => void): () => void {
    if (!ipcRenderer) return () => {};
    const handler = (_event: any, data: string) => callback(data);
    ipcRenderer.on("sqluiNativeEvent/ipcElectronCommand", handler);
    return () => {
      ipcRenderer.removeListener("sqluiNativeEvent/ipcElectronCommand", handler);
    };
  },
};
