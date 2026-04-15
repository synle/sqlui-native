/** Browser platform implementation. Default fallback when not in Tauri. */
import type { PlatformBridge } from "src/frontend/platform/types";

export const browserPlatform: PlatformBridge = {
  isDesktop: false,
  isTauri: false,
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

  onAppCommand(_callback: (event: string) => void): () => void {
    return () => {};
  },

  executeShellCommand(_command: string): Promise<string> {
    return Promise.resolve("");
  },
};
