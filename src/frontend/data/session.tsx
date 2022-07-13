import { SessionStorageConfig } from 'src/frontend/data/config';
import { getGeneratedRandomId } from 'src/frontend/utils/commonUtils';

export const DEFAULT_SESSION_NAME = 'electron-default';

export function getDefaultSessionId() {
  let sessionId = SessionStorageConfig.get<string>('clientConfig/api.sessionId', '');
  return sessionId || DEFAULT_SESSION_NAME;
}

export function getRandomSessionId() {
  return getGeneratedRandomId(`sessionId`);
}

export function getCurrentSessionId() {
  let sessionId = getDefaultSessionId();
  SessionStorageConfig.set('clientConfig/api.sessionId', sessionId);
  return sessionId;
}

export function setCurrentSessionId(newSessionId: string) {
  SessionStorageConfig.clear();
  SessionStorageConfig.set('clientConfig/api.sessionId', newSessionId);

  // reload the page
  window.history.replaceState(null, document.title, '/');
  window.location.reload();
}
