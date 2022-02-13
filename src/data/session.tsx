import { SessionStorageConfig } from 'src/data/config';
import {getGeneratedRandomId} from 'src/utils/commonUtils';

export function getDefaultSessionId() {
  let sessionId = SessionStorageConfig.get<string>('clientConfig/api.sessionId', '');

  if (window.isElectron) {
    // default value for electron
    if (!sessionId) {
      sessionId = 'electron-default';
    }
  } else {
    // default value for mocked server
    if (!sessionId) {
      sessionId = 'mocked-server-default';
    }
  }

  return sessionId;
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
}
