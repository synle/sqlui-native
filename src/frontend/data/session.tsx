import { SessionStorageConfig } from 'src/frontend/data/config';
import { getGeneratedRandomId } from 'src/frontend/utils/commonUtils';

export const DEFAULT_SESSION_NAME = 'electron-default';

export function getRandomSessionId() {
  return getGeneratedRandomId(`sessionId`);
}

export function setCurrentSessionId(newSessionId: string, suppressReload = false) {
  const currentWindowId = sessionStorage.getItem('sqlui-native.windowId') || '';

  // clear current configs
  SessionStorageConfig.clear();

  // set the new sessionId
  sessionStorage.setItem('sqlui-native.sessionId', newSessionId);
  sessionStorage.setItem('sqlui-native.windowId', currentWindowId);

  // reload the page
  if(suppressReload === false){
    window.location.reload();
  }
}
