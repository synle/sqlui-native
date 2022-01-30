import { SqluiCore, SqluiFrontend } from 'typings';
import { SessionStorageConfig } from 'src/data/config';

export function getDefaultSessionId() {
  let sessionId = SessionStorageConfig.get<string>('api.sessionId', '');

  // @ts-ignore
  if (window.isElectron) {
    // default value for electron
    if (!sessionId) {
      sessionId = getRandomSessionId();
    }
  } else {
    // default value for mocked server
    if (!sessionId) {
      sessionId = 'mocked-server';
    }
  }

  return sessionId;
}

export function getRandomSessionId() {
  return `sessionId.${Date.now()}.${Math.random() * 1000}`;
}

export function getCurrentSessionId() {
  let sessionId = getDefaultSessionId();
  SessionStorageConfig.set('api.sessionId', sessionId);
  return sessionId;
}

export function setCurrentSessionId(newSessionId: string) {
  SessionStorageConfig.clear();
  SessionStorageConfig.set('api.sessionId', newSessionId);
}
