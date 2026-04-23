/** Tauri v2 platform implementation using @tauri-apps/api for native integration. */
import type { PlatformBridge } from "src/frontend/platform/types";

/** The Tauri platform bridge for desktop app integration. */
export const tauriPlatform: PlatformBridge = {
  isDesktop: true,

  openExternalUrl(url: string) {
    import("@tauri-apps/plugin-opener").then((mod) => mod.openUrl(url)).catch(() => window.open(url, "_blank"));
  },

  openAppWindow(hashLink: string) {
    window.open(`/#${hashLink}`);
  },

  toggleMenuItems(_visible: boolean, _menuIds: string[]) {
    // Tauri menu item enable/disable not implemented yet
  },

  async readFileContent(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    // Use Tauri invoke to get the sidecar port for absolute URL
    let baseUrl = "";
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const port = await invoke<number>("get_sidecar_port");
      if (port > 0) baseUrl = `http://127.0.0.1:${port}`;
    } catch (_err) {
      // fall back to relative URL
    }
    return fetch(`${baseUrl}/api/file`, {
      method: "POST",
      body: form,
    }).then((r) => r.text());
  },

  executeShellCommand(_command: string): Promise<string> {
    return Promise.resolve("");
  },

  getFilePath(_file: File): string | null {
    return null;
  },

  onAppCommand(callback: (event: string) => void): () => void {
    let unlisten: (() => void) | undefined;

    import("@tauri-apps/api/event")
      .then((mod) => mod.listen<string>("menu-command", (event) => callback(event.payload)))
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => console.error("platform/tauri.ts:onAppCommand", err));

    return () => {
      unlisten?.();
    };
  },
};
