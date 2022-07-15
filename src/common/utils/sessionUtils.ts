let openSessions: Record<string, string> = {};

export function reset() {
  openSessions = {};
}

export function get() {
  return openSessions;
}

export function getByWindowId(windowId: string) {
  return openSessions[windowId];
}

export function listSessionIds() {
  return Object.values(openSessions);
}

export function open(windowId: string, sessionId: string) {
  openSessions[windowId] = sessionId;
  return sessionId;
}

export function close(windowId: string) {
  delete openSessions[windowId];
}
