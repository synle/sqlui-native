/** Tauri v2 platform implementation using @tauri-apps/api for native integration. */
import type { PlatformBridge } from "src/frontend/platform/types";

/** The Tauri platform bridge for desktop app integration. */
export const tauriPlatform: PlatformBridge = {
  isDesktop: true,

  openExternalUrl(url: string) {
    import("@tauri-apps/plugin-opener")
      .then((mod) => mod.openUrl(url))
      .catch(() => window.open(url, "_blank"));
  },

  openAppWindow(hashLink: string) {
    window.open(`/#${hashLink}`);
  },

  toggleMenuItems(_visible: boolean, _menuIds: string[]) {
    // Tauri menu item enable/disable not implemented yet
  },

  readFileContent(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    return fetch("/api/file", {
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
