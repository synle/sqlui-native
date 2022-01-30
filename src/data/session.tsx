import { SqluiCore, SqluiFrontend } from 'typings';
import { SessionStorageConfig } from 'src/data/config';

export function getCurrentsessionId() {
  let sessionId: string = 'mocked-server';
  try {
    // @ts-ignore
    if (window.isElectron) {
      sessionId = SessionStorageConfig.get<string>('api.sessionId', '');
      if (!sessionId) {
        sessionId = `sessionId.${Date.now()}.${Math.random() * 1000}`;
      }
    }

    // persist this instance id
    SessionStorageConfig.set('api.sessionId', sessionId);
  } catch (err) {
    //@ts-ignore
  }
  return sessionId;
}
