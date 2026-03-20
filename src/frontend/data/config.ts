import { SqluiEnums } from "typings";

/** Wrapper around sessionStorage for typed get/set of client configuration values. */
export const SessionStorageConfig = {
  /**
   * Stores a value in sessionStorage under the given key.
   * @param key - The config key to store under.
   * @param value - The value to serialize and store.
   */
  set(key: SqluiEnums.ClientConfigKey, value: any) {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  },

  /**
   * Retrieves and deserializes a value from sessionStorage.
   * @param key - The config key to retrieve.
   * @param defaultValue - Fallback value if the key is absent or unparseable.
   * @returns The stored value cast to T, or defaultValue.
   */
  get<T>(key: SqluiEnums.ClientConfigKey, defaultValue?: T): T {
    let res;

    try {
      res = JSON.parse(window.sessionStorage.getItem(key) || "");
    } catch (_err) {
      res = defaultValue;
    }

    return res;
  },

  /** Clears all entries from sessionStorage. */
  clear() {
    window.sessionStorage.clear();
  },
};

/** Wrapper around localStorage for typed get/set of client configuration values. */
export const LocalStorageConfig = {
  /**
   * Stores a value in localStorage under the given key.
   * @param key - The config key to store under.
   * @param value - The value to serialize and store.
   */
  set(key: SqluiEnums.ClientConfigKey, value: any) {
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  /**
   * Retrieves and deserializes a value from localStorage.
   * @param key - The config key to retrieve.
   * @param defaultValue - Fallback value if the key is absent or unparseable.
   * @returns The stored value cast to T, or defaultValue.
   */
  get<T>(key: SqluiEnums.ClientConfigKey, defaultValue?: T): T {
    let res;

    try {
      res = JSON.parse(window.localStorage.getItem(key) || "");
    } catch (_err) {
      res = defaultValue;
    }

    return res;
  },

  /** Clears all entries from localStorage. */
  clear() {
    window.localStorage.clear();
  },
};
