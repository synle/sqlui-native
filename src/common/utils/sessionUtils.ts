import { BrowserWindow } from 'electron';

let openedSessions: Record<string, string> = {};
let openedWindows: Record<string, any> = {};

export function reset() {
  openedSessions = {};
}

export function get() {
  return openedSessions;
}

export function getByWindowId(windowId: string) {
  return openedSessions[windowId];
}

export function getWindowBySessionId(targetSessionId: string){
  for(const windowId of Object.keys(openedSessions)){
    const sessionId = openedSessions[windowId]

    if(targetSessionId === sessionId){
      //@ts-ignore
      return openedWindows[targetSessionId] as BrowserWindow;
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

export function close(windowId: string) {
  delete openedSessions[windowId];
}

export function registerWindow(windowId: string, browserWindow: BrowserWindow){
  openedWindows[windowId] = browserWindow;
}
