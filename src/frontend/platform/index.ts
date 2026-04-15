/** Platform detection and singleton export.
 * Detects Electron or browser environment and provides the appropriate PlatformBridge.
 */
import type { PlatformBridge } from "src/frontend/platform/types";
import { browserPlatform } from "src/frontend/platform/browser";
import { electronPlatform, initElectronPlatform } from "src/frontend/platform/electron";

/** True when running inside Electron with requireElectron available. */
function isElectronEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return w?.process?.env?.ENV_TYPE !== "mocked-server" && typeof w.requireElectron === "function";
}

/** The active platform bridge for the current runtime environment. */
export const platform: PlatformBridge = isElectronEnvironment() ? electronPlatform : browserPlatform;

/** Initializes the platform (sets up IPC fetch polyfill in Electron mode).
 * Must be called once before the app renders.
 */
export function initPlatform(): void {
  if (platform === electronPlatform) {
    initElectronPlatform();
  }
}
