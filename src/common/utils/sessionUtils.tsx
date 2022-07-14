let openedSessionIds : Record<string, string>= {};

export const DEFAULT_SESSION_NAME = 'electron-default';

export function reset(){
  openedSessionIds = {};
}

export function open(windowId: string, sessionId: string = DEFAULT_SESSION_NAME){
}

export function close(windowId: string, sessionId: string){
}
