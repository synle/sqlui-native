/** Browser platform implementation. Default fallback when not in Electron. */
import type { PlatformBridge } from "src/frontend/platform/types";

export const browserPlatform: PlatformBridge = {
  isDesktop: false,
  sidecarBaseUrl: "",

  openExternalUrl(url: string) {
    window.open(url, "_blank");
  },

  openAppWindow(hashLink: string) {
    window.open(`/#${hashLink}`);
  },

  toggleMenuItems(_visible: boolean, _menuIds: string[]) {
    // No native menu in browser mode
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

  onAppCommand(_callback: (event: string) => void): () => void {
    return () => {};
  },
};
