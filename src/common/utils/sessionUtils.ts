import { BrowserWindow } from "electron";
let openedSessions: Record<string, string> = {};
let openedWindows: Record<string, BrowserWindow> = {};

export function reset() {
  openedSessions = {};
}

export function get() {
  return openedSessions;
}

export function getByWindowId(windowId: string) {
  return openedSessions[windowId];
}

export function getWindowIdBySessionId(targetSessionId: string) {
  for (const windowId of Object.keys(openedSessions)) {
    const sessionId = openedSessions[windowId];

    if (targetSessionId === sessionId) {
      return windowId;
    }
  }

  return undefined;
}

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

export async function close(windowId?: string) {
  if (!windowId) {
    return;
  }

  try {
    openedWindows[windowId]?.close();
  } catch (err) {}

  delete openedSessions[windowId];
  delete openedWindows[windowId];
}

export async function focus(windowId?: string) {
  if (!windowId) {
    return;
  }

  try {
    openedWindows[windowId]?.focus();
  } catch (err) {}
}

export function registerWindow(windowId: string, browserWindow: BrowserWindow) {
  openedWindows[windowId] = browserWindow;
}
