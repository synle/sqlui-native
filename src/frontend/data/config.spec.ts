// @vitest-environment jsdom
import { SessionStorageConfig, LocalStorageConfig } from "src/frontend/data/config";

// Node 24 ships a broken globalThis.localStorage (missing clear/getItem/setItem)
// which shadows jsdom's proper implementation. Replace it with a spec-compliant mock.
beforeAll(() => {
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
    const result = LocalStorageConfig.get<number>("clientConfig/leftPanelWidth");
    expect(result).toEqual(400);
  });

  test("get returns defaultValue when key is missing", () => {
    const result = LocalStorageConfig.get("clientConfig/leftPanelWidth", 300);
    expect(result).toEqual(300);
  });

  test("clear removes all items", () => {
    LocalStorageConfig.set("clientConfig/leftPanelWidth", 500);
    LocalStorageConfig.clear();
    const result = LocalStorageConfig.get("clientConfig/leftPanelWidth", 300);
    expect(result).toEqual(300);
  });
});
