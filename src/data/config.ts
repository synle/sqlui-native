import {SqluiEnums} from 'typings';
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

  clear() {
    window.sessionStorage.clear();
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

  clear() {
    window.localStorage.clear();
  },
};