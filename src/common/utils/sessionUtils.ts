let openSessions : Record<string, string>= {};

export const DEFAULT_SESSION_NAME = 'electron-default';

export function reset(){
  openSessions = {};
}

export function get(){
  return openSessions
}

export function getByWindowId(windowId: string){
  return openSessions[windowId]
}

export function listSessionIds(){
  return Object.values(openSessions);
}

export function open(windowId: string, sessionId: string = DEFAULT_SESSION_NAME){
  // TODO: handling opening the same session id - should throw a conflict error
  openSessions[windowId] = sessionId;
}

export function close(windowId: string){
  delete openSessions[windowId];
}
