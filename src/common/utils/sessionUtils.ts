import { BrowserWindow } from "electron";
let openedSessions: Record<string, string> = {};
const openedWindows: Record<string, BrowserWindow> = {};

/**
 * Resets all tracked session-to-window mappings.
 */
export function reset() {
  openedSessions = {};
}

/**
 * Returns the full mapping of window IDs to session IDs.
 * @returns Record of windowId to sessionId.
 */
export function get() {
  return openedSessions;
}

/**
 * Gets the session ID associated with a given window ID.
 * @param windowId - The window identifier.
 * @returns The associated session ID, or undefined if not found.
 */
export function getByWindowId(windowId: string) {
  return openedSessions[windowId];
}

/**
 * Finds the window ID that has a given session ID open.
 * @param targetSessionId - The session ID to search for.
 * @returns The matching window ID, or undefined if not found.
 */
export function getWindowIdBySessionId(targetSessionId: string) {
  for (const windowId of Object.keys(openedSessions)) {
    const sessionId = openedSessions[windowId];

    if (targetSessionId === sessionId) {
      return windowId;
    }
  }

  return undefined;
}

/**
 * Returns a list of all currently opened session IDs.
 * @returns Array of session ID strings.
 */
export function listSessionIds() {
  return Object.values(openedSessions);
}

/**
 * This method attempt to open the sessionId associated with the windowId
 * @param  {string}  windowId  [description]
 * @param  {string}  sessionId [description]
 * @return {boolean} true if the sessionId has never been opened by any of existing windowId
 */
export function open(windowId: string, sessionId: string): boolean {
  const foundWindowId = getWindowIdBySessionId(sessionId);
  if (!foundWindowId) {
    // set up this sessionId if it's not already selected
    openedSessions[windowId] = sessionId;
    return true;
  } else {
    // if it is already set up, then let's focus on that window
    focus(foundWindowId);
    return false;
  }
}

/**
 * Closes a window and removes its session mapping.
 * @param windowId - The window ID to close; no-op if undefined.
 */
export async function close(windowId?: string) {
  if (!windowId) {
    return;
  }

  try {
    openedWindows[windowId]?.close();
  } catch (err) {
    console.error("sessionUtils.ts:close", err);
  }

  delete openedSessions[windowId];
  delete openedWindows[windowId];
}

/**
 * Brings a window to the foreground by its window ID.
 * @param windowId - The window ID to focus; no-op if undefined.
 */
export async function focus(windowId?: string) {
  if (!windowId) {
    return;
  }

  try {
    openedWindows[windowId]?.focus();
  } catch (err) {
    console.error("sessionUtils.ts:focus", err);
  }
}

/**
 * Registers a BrowserWindow instance for tracking, enabling close/focus operations.
 * @param windowId - The unique window identifier.
 * @param browserWindow - The Electron BrowserWindow instance to register.
 */
export function registerWindow(windowId: string, browserWindow: BrowserWindow) {
  openedWindows[windowId] = browserWindow;
}
