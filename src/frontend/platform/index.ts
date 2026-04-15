/** Platform detection and singleton export.
 * Detects Tauri or browser environment and provides the appropriate PlatformBridge.
 */
import type { PlatformBridge } from "src/frontend/platform/types";
import { browserPlatform } from "src/frontend/platform/browser";
import { tauriPlatform, initTauriPlatform } from "src/frontend/platform/tauri";

/** Detects the current runtime environment and returns the matching PlatformBridge. */
function detectPlatform(): PlatformBridge {
  if (typeof window === "undefined") {
    return browserPlatform;
  }
  if ((window as any).__TAURI_INTERNALS__) {
    return tauriPlatform;
  }
  return browserPlatform;
}

/** The active platform bridge for the current runtime environment. */
export const platform: PlatformBridge = detectPlatform();

/** Initializes the platform (resolves sidecar port in Tauri mode).
 * Must be called once before the app renders.
 */
export async function initPlatform(): Promise<void> {
  if (platform.isTauri) {
    await initTauriPlatform();
  }
}
