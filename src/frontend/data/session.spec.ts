// @vitest-environment jsdom
import { vi } from "vitest";
import { getCurrentSessionId, setSessionIdIfNotDefined, clearCurrentSessionId, setCurrentSessionId } from "src/frontend/data/session";

describe("session", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  describe("getCurrentSessionId", () => {
    test("returns empty string when no session is set", () => {
      expect(getCurrentSessionId()).toBe("");
    });

    test("returns the stored session id", () => {
      sessionStorage.setItem("sqlui-native.sessionId", "my-session-42");
      expect(getCurrentSessionId()).toBe("my-session-42");
    });
  });

  describe("setSessionIdIfNotDefined", () => {
    test("sets session id when none exists", () => {
      setSessionIdIfNotDefined("fallback-session");
      expect(sessionStorage.getItem("sqlui-native.sessionId")).toBe("fallback-session");
    });

    test("does not overwrite existing session id", () => {
      sessionStorage.setItem("sqlui-native.sessionId", "existing-session");
      setSessionIdIfNotDefined("fallback-session");
      expect(sessionStorage.getItem("sqlui-native.sessionId")).toBe("existing-session");
    });
  });

  describe("clearCurrentSessionId", () => {
    test("removes session id from sessionStorage", () => {
      sessionStorage.setItem("sqlui-native.sessionId", "to-be-cleared");
      clearCurrentSessionId();
      expect(sessionStorage.getItem("sqlui-native.sessionId")).toBeNull();
    });

    test("clears other session config items", () => {
      sessionStorage.setItem("clientConfig/cache.treeVisibles", '{"a":true}');
      sessionStorage.setItem("sqlui-native.sessionId", "my-session");
      clearCurrentSessionId();
      expect(sessionStorage.getItem("clientConfig/cache.treeVisibles")).toBeNull();
    });
  });

  describe("setCurrentSessionId", () => {
    test("sets the session id in sessionStorage", () => {
      setCurrentSessionId("test-session-123", true);
      expect(sessionStorage.getItem("sqlui-native.sessionId")).toBe("test-session-123");
    });

    test("clears previous session config before setting new id", () => {
      sessionStorage.setItem("clientConfig/cache.treeVisibles", '{"old":true}');
      setCurrentSessionId("new-session", true);
      expect(sessionStorage.getItem("clientConfig/cache.treeVisibles")).toBeNull();
      expect(sessionStorage.getItem("sqlui-native.sessionId")).toBe("new-session");
    });

    test("overwrites existing session id", () => {
      setCurrentSessionId("first-session", true);
      setCurrentSessionId("second-session", true);
      expect(sessionStorage.getItem("sqlui-native.sessionId")).toBe("second-session");
    });
  });
});
