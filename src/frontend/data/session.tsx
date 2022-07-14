import { SessionStorageConfig } from 'src/frontend/data/config';
import { getGeneratedRandomId } from 'src/frontend/utils/commonUtils';

export const DEFAULT_SESSION_NAME = 'electron-default';

export function getRandomSessionId() {
  return getGeneratedRandomId(`sessionId`);
}

export function getCurrentSessionId() {
  return SessionStorageConfig.get<string>('clientConfig/api.sessionId', '');
}

export function setCurrentSessionId(newSessionId: string) {
  SessionStorageConfig.clear();
  SessionStorageConfig.set('clientConfig/api.sessionId', newSessionId);

  // reload the page
  window.location.reload();
}
