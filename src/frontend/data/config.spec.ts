// @vitest-environment jsdom
import { SessionStorageConfig, LocalStorageConfig } from "src/frontend/data/config";

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
