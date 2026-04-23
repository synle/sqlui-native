import { SessionStorageConfig } from "src/frontend/data/config";

/**
 * Returns a unique scope key for this window, used to namespace per-window data in localStorage.
 * In Tauri, each webview window has a unique label (e.g., "main", "main-1") that persists across
 * reloads. In browser mode, falls back to a per-tab UUID stored in sessionStorage.
 * @returns The window scope string.
 */
function getWindowScope(): string {
  // In Tauri, use the webview window label (unique per window, survives reloads)
  try {
    const label = (window as any).__TAURI_INTERNALS__?.metadata?.currentWebview?.label;
    if (label) {
      return label;
    }
  } catch (_err) {
    // not in Tauri
  }

  // In browser, sessionStorage is truly per-tab, so a UUID stored there works
  let id = sessionStorage.getItem("sqlui-native.windowScope");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("sqlui-native.windowScope", id);
  }
  return id;
}

/** localStorage key for the session ID scoped to this window. */
function sessionIdKey(): string {
  return `sqlui-native.sessionId.${getWindowScope()}`;
}

/**
 * Returns the current session ID for this window, or empty string if not set.
 * Stored in localStorage keyed by the window scope so each Tauri window has its own session.
 * @returns The current session ID or empty string.
 */
export function getCurrentSessionId(): string {
  return localStorage.getItem(sessionIdKey()) || "";
}

/**
 * Sets the session ID to the given value if no session ID is currently defined for this window.
 * @param sessionId - The session ID to set as fallback.
 */
export function setSessionIdIfNotDefined(sessionId: string) {
  if (!localStorage.getItem(sessionIdKey())) {
    localStorage.setItem(sessionIdKey(), sessionId);
  }
}

/**
 * Clears the current session ID and all session configs for this window.
 */
export function clearCurrentSessionId() {
  SessionStorageConfig.clear();
  localStorage.removeItem(sessionIdKey());
}

/**
 * Sets the current session ID for this window and optionally reloads the page.
 * @param newSessionId - The new session ID to set.
 * @param suppressReload - If true, skip page reload after switching sessions.
 */
export function setCurrentSessionId(newSessionId: string, suppressReload = false) {
  // clear current configs
  SessionStorageConfig.clear();

  // set the new sessionId (in localStorage, scoped to this window)
  localStorage.setItem(sessionIdKey(), newSessionId);

  // navigate to root and reload
  if (suppressReload === false) {
    window.location.hash = "#/";
    window.location.reload();
  }
}
