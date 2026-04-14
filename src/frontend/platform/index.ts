/** Platform detection and singleton export.
 * Detects Tauri or browser environment and provides the appropriate PlatformBridge.
 */
import type { PlatformBridge } from "src/frontend/platform/types";
import { browserPlatform } from "src/frontend/platform/browser";
import { tauriPlatform } from "src/frontend/platform/tauri";

/** Detects the current runtime environment and returns the matching PlatformBridge. */
function detectPlatform(): PlatformBridge {
  // Guard for non-browser environments (e.g., Node.js test runners)
  if (typeof window === "undefined") {
    return browserPlatform;
  }

  // Tauri injects __TAURI_INTERNALS__ into the window
  if ((window as any).__TAURI_INTERNALS__) {
    return tauriPlatform;
  }

  return browserPlatform;
}

/** The active platform bridge for the current runtime environment. */
export const platform: PlatformBridge = detectPlatform();
