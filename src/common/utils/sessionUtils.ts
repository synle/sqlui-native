const openedWindows: Record<string, any> = {};

/**
 * Closes a BrowserWindow by its window ID.
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
export function registerWindow(windowId: string, browserWindow: any) {
  openedWindows[windowId] = browserWindow;
}
