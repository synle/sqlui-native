/** Platform detection and singleton export.
 * Detects Tauri, Electron, or browser environment and provides the appropriate PlatformBridge.
 */
import type { PlatformBridge } from "src/frontend/platform/types";
import { browserPlatform } from "src/frontend/platform/browser";
import { electronPlatform, initElectronPlatform } from "src/frontend/platform/electron";
import { tauriPlatform, initTauriPlatform } from "src/frontend/platform/tauri";

/** True when running inside Tauri with __TAURI_INTERNALS__ available. */
function isTauriEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).__TAURI_INTERNALS__;
}

/** True when running inside Electron with requireElectron available. */
function isElectronEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return w?.process?.env?.ENV_TYPE !== "browser" && typeof w.requireElectron === "function";
}

/** The active platform bridge for the current runtime environment. */
export const platform: PlatformBridge = isTauriEnvironment()
  ? tauriPlatform
  : isElectronEnvironment()
    ? electronPlatform
    : browserPlatform;

/** Initializes the platform (sets up Tauri sidecar port or Electron IPC for shell integration).
 * Must be called once before the app renders.
 */
export async function initPlatform(): Promise<void> {
  if (platform === tauriPlatform) {
    await initTauriPlatform();
  } else if (platform === electronPlatform) {
    initElectronPlatform();
  }
}
