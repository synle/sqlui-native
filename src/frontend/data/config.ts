import { SqluiEnums } from "typings";

const _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const _debouncePending = new Map<string, string>();

/** Debounced localStorage setItem — coalesces rapid writes. Flush on pagehide. */
function _debouncedSetItem(key: string, rawValue: string) {
  _debouncePending.set(key, rawValue);
  const existing = _debounceTimers.get(key);
  if (existing) clearTimeout(existing);
  _debounceTimers.set(
    key,
    setTimeout(() => {
      window.localStorage.setItem(key, _debouncePending.get(key) ?? rawValue);
      _debounceTimers.delete(key);
      _debouncePending.delete(key);
    }, 50),
  );
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    for (const [key, timer] of _debounceTimers) {
      clearTimeout(timer);
      window.localStorage.setItem(key, _debouncePending.get(key) ?? "");
    }
    _debounceTimers.clear();
    _debouncePending.clear();
  });
}

/** Wrapper around sessionStorage for typed get/set of client configuration values. */
export const SessionStorageConfig = {
  set(key: SqluiEnums.ClientConfigKey, value: any) {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  },

  get<T>(key: SqluiEnums.ClientConfigKey, defaultValue?: T): T {
    let res;

    try {
      res = JSON.parse(window.sessionStorage.getItem(key) || "");
    } catch (_err) {
      res = defaultValue;
    }

    return res;
  },

  clear() {
    window.sessionStorage.clear();
  },
};

/** Wrapper around localStorage for typed get/set of client configuration values. */
export const LocalStorageConfig = {
  set(key: SqluiEnums.ClientConfigKey, value: any) {
    _debouncedSetItem(key, JSON.stringify(value));
  },

  get<T>(key: SqluiEnums.ClientConfigKey, defaultValue?: T): T {
    let res;

    try {
      res = JSON.parse(window.localStorage.getItem(key) || "");
    } catch (_err) {
      res = defaultValue;
    }

    return res;
  },

  clear() {
    window.localStorage.clear();
  },
};
