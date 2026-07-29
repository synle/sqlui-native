// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { SessionStorageConfig, LocalStorageConfig } from "src/frontend/data/config";

// Node 24 ships a broken globalThis.localStorage (missing clear/getItem/setItem)
// which shadows jsdom's proper implementation. Replace it with a spec-compliant mock.
beforeAll(() => {
  vi.useFakeTimers();

  if (typeof window.localStorage.clear !== "function") {
    const store: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => (key in store ? store[key] : null),
        setItem: (key: string, value: string) => {
          store[key] = String(value);
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          for (const key of Object.keys(store)) delete store[key];
        },
        get length() {
          return Object.keys(store).length;
        },
        key: (index: number) => Object.keys(store)[index] ?? null,
      },
      writable: true,
      configurable: true,
    });
  }
});

afterEach(() => {
  vi.runAllTimers();
});

describe("SessionStorageConfig", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  test("set and get a value", () => {
    SessionStorageConfig.set("clientConfig/cache.treeVisibles", { a: true });
    const result = SessionStorageConfig.get("clientConfig/cache.treeVisibles");
    expect(result).toEqual({ a: true });
  });

  test("get returns defaultValue when key is missing", () => {
    const result = SessionStorageConfig.get("clientConfig/cache.treeVisibles", { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  test("clear removes all items", () => {
    SessionStorageConfig.set("clientConfig/cache.treeVisibles", { a: true });
    SessionStorageConfig.clear();
    const result = SessionStorageConfig.get("clientConfig/cache.treeVisibles", {});
    expect(result).toEqual({});
  });
});

describe("LocalStorageConfig", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("set and get a value", () => {
    LocalStorageConfig.set("clientConfig/leftPanelWidth", 400);
    vi.advanceTimersByTime(50);
    const result = LocalStorageConfig.get<number>("clientConfig/leftPanelWidth");
    expect(result).toEqual(400);
  });

  test("get returns defaultValue when key is missing", () => {
    const result = LocalStorageConfig.get("clientConfig/leftPanelWidth", 300);
    expect(result).toEqual(300);
  });

  test("clear removes all items", () => {
    LocalStorageConfig.set("clientConfig/leftPanelWidth", 500);
    vi.advanceTimersByTime(50);
    LocalStorageConfig.clear();
    const result = LocalStorageConfig.get("clientConfig/leftPanelWidth", 300);
    expect(result).toEqual(300);
  });

  // Writes are debounced by 50 ms. These cover the window *before* the timer fires — the case the
  // tests above skip by advancing timers first.
  describe("reads during the debounce window", () => {
    test("get returns the value just written, before the debounce fires", () => {
      LocalStorageConfig.set("clientConfig/leftPanelWidth", 400);

      // No timer advance: localStorage has not been touched yet.
      expect(window.localStorage.getItem("clientConfig/leftPanelWidth")).toBeNull();
      expect(LocalStorageConfig.get<number>("clientConfig/leftPanelWidth", 300)).toEqual(400);
    });

    test("get returns the newest value when several writes coalesce", () => {
      LocalStorageConfig.set("clientConfig/leftPanelWidth", 400);
      LocalStorageConfig.set("clientConfig/leftPanelWidth", 500);
      LocalStorageConfig.set("clientConfig/leftPanelWidth", 600);

      expect(LocalStorageConfig.get<number>("clientConfig/leftPanelWidth", 300)).toEqual(600);

      vi.advanceTimersByTime(50);
      expect(LocalStorageConfig.get<number>("clientConfig/leftPanelWidth", 300)).toEqual(600);
    });

    test("get does not shadow a previously stored value once the write lands", () => {
      LocalStorageConfig.set("clientConfig/leftPanelWidth", 400);
      vi.advanceTimersByTime(50);

      LocalStorageConfig.set("clientConfig/leftPanelWidth", 700);
      expect(LocalStorageConfig.get<number>("clientConfig/leftPanelWidth", 300)).toEqual(700);

      vi.advanceTimersByTime(50);
      expect(LocalStorageConfig.get<number>("clientConfig/leftPanelWidth", 300)).toEqual(700);
    });

    test("clear cancels a pending write so it cannot resurrect the key", () => {
      LocalStorageConfig.set("clientConfig/leftPanelWidth", 500);
      LocalStorageConfig.clear();

      // The pending timer would otherwise fire here and re-create the key that was just cleared.
      vi.advanceTimersByTime(50);

      expect(window.localStorage.getItem("clientConfig/leftPanelWidth")).toBeNull();
      expect(LocalStorageConfig.get("clientConfig/leftPanelWidth", 300)).toEqual(300);
    });
  });
});
