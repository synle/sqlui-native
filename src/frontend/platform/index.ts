/** Platform detection and singleton export.
 * Detects Tauri or browser environment and provides the appropriate PlatformBridge.
 */
import type { PlatformBridge } from "src/frontend/platform/types";
import { browserPlatform } from "src/frontend/platform/browser";
import { tauriPlatform, initTauriPlatform } from "src/frontend/platform/tauri";

/** True when running inside Tauri with __TAURI_INTERNALS__ available. */
function isTauriEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any).__TAURI_INTERNALS__;
}

/** The active platform bridge for the current runtime environment. */
export const platform: PlatformBridge = isTauriEnvironment() ? tauriPlatform : browserPlatform;

/** Initializes the platform (sets up Tauri sidecar port resolution).
 * Must be called once before the app renders.
 */
export async function initPlatform(): Promise<void> {
  if (platform === tauriPlatform) {
    await initTauriPlatform();
  }
}
