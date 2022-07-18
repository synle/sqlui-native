import { BrowserWindow } from 'electron';
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

export function open(windowId: string, sessionId: string) {
  openedSessions[windowId] = sessionId;
  return sessionId;
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

export function registerWindow(windowId: string, browserWindow: BrowserWindow) {
  openedWindows[windowId] = browserWindow;
}
