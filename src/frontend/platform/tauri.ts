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

  async pickFile(options?: { title?: string; filters?: { name: string; extensions: string[] }[] }): Promise<string | null> {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        directory: false,
        title: options?.title,
        filters: options?.filters,
      });
      if (!selected) return null;
      // In Tauri v2, single-file selection returns a string path directly.
      return typeof selected === "string" ? selected : null;
    } catch (err) {
      console.error("platform/tauri.ts:pickFile", err);
      return null;
    }
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

  async saveTextFile(opts): Promise<string | null> {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const selected = await save({
        defaultPath: opts.suggestedName,
        filters: opts.filters,
      });
      if (!selected || typeof selected !== "string") return null;

      // The renderer can't touch the filesystem directly without plugin-fs scopes,
      // so POST the payload to the sidecar (same machine, 127.0.0.1) which can.
      let baseUrl = "";
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const port = await invoke<number>("get_sidecar_port");
        if (port > 0) baseUrl = `http://127.0.0.1:${port}`;
      } catch (_err) {
        // fall back to relative URL — fine when running under Vite dev proxy
      }
      const res = await fetch(`${baseUrl}/api/file/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selected, content: opts.content }),
      });
      if (!res.ok) {
        console.error("platform/tauri.ts:saveTextFile", `HTTP ${res.status}`);
        return null;
      }
      const body = (await res.json()) as { path?: string };
      return body?.path ?? selected;
    } catch (err) {
      console.error("platform/tauri.ts:saveTextFile", err);
      return null;
    }
  },

  async revealItemInDir(filePath: string): Promise<void> {
    try {
      const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
      await revealItemInDir(filePath);
    } catch (err) {
      console.error("platform/tauri.ts:revealItemInDir", err);
    }
  },
};
