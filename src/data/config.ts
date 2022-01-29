import { SqluiEnums } from 'typings';

export const SessionStorageConfig = {
  set(key: SqluiEnums.ClientConfigKey, value: any) {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  },

  get<T>(key: SqluiEnums.ClientConfigKey, defaultValue?: T): T {
    let res;

    try {
      res = JSON.parse(window.sessionStorage.getItem(key) || '');
    } catch (err) {
      res = defaultValue;
    }

    return res;
  },
};

export const LocalStorageConfig = {
  set(key: SqluiEnums.ClientConfigKey, value: any) {
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  get<T>(key: SqluiEnums.ClientConfigKey, defaultValue?: T): T {
    let res;

    try {
      res = JSON.parse(window.localStorage.getItem(key) || '');
    } catch (err) {
      res = defaultValue;
    }

    return res;
  },
};

let DefaultConfig = LocalStorageConfig;
try {
  // @ts-ignore
  if (window.isElectron) {
    // if it's in electron mode then we will use session storage
    // to support multiple query windows
    DefaultConfig = SessionStorageConfig;
  }
} catch (err) {
  //@ts-ignore
}

export default DefaultConfig;
