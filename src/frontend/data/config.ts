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
      const pending = _debouncePending.get(key);
      // Only flush keys that actually have a pending value — writing "" would poison the next read,
      // which parses the stored string and would fall back to the default on failure.
      if (pending !== undefined) {
        window.localStorage.setItem(key, pending);
      }
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
      // A debounced write may not have reached localStorage yet, so the pending value — not what is
      // currently stored — is the authoritative one. Without this, a read within the debounce window
      // returns the previous value.
      const raw = _debouncePending.get(key) ?? window.localStorage.getItem(key) ?? "";
      res = JSON.parse(raw);
    } catch (_err) {
      res = defaultValue;
    }

    return res;
  },

  clear() {
    // Cancel in-flight writes first: a pending timer firing after the clear would resurrect the key.
    for (const timer of _debounceTimers.values()) {
      clearTimeout(timer);
    }
    _debounceTimers.clear();
    _debouncePending.clear();

    window.localStorage.clear();
  },
};
