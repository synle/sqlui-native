import { SessionStorageConfig } from "src/frontend/data/config";
import { getGeneratedRandomId } from "src/frontend/utils/commonUtils";

/**
 * Generates a random session ID with a "sessionId" prefix.
 * @returns A unique session ID string.
 */
export function getRandomSessionId() {
  return getGeneratedRandomId(`sessionId`);
}

/**
 * Returns the current session ID from sessionStorage, or empty string if not set.
 * @returns The current session ID or empty string.
 */
export function getCurrentSessionId(): string {
  return sessionStorage.getItem("sqlui-native.sessionId") || "";
}

/**
 * Sets the session ID to the given value if no session ID is currently defined in sessionStorage.
 * @param sessionId - The session ID to set as fallback.
 */
export function setSessionIdIfNotDefined(sessionId: string) {
  if (!sessionStorage.getItem("sqlui-native.sessionId")) {
    sessionStorage.setItem("sqlui-native.sessionId", sessionId);
  }
}

/**
 * Clears the current session ID and all session configs from sessionStorage.
 */
export function clearCurrentSessionId() {
  SessionStorageConfig.clear();
  sessionStorage.removeItem("sqlui-native.sessionId");
}

/**
 * Sets the current session ID in sessionStorage and optionally reloads the page.
 * @param newSessionId - The new session ID to set.
 * @param suppressReload - If true, skip page reload after switching sessions.
 */
export function setCurrentSessionId(newSessionId: string, suppressReload = false) {
  // clear current configs
  SessionStorageConfig.clear();

  // set the new sessionId
  sessionStorage.setItem("sqlui-native.sessionId", newSessionId);

  // navigate to root and reload
  if (suppressReload === false) {
    window.location.hash = "#/";
    window.location.reload();
  }
}
