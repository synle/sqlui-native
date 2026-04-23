// @vitest-environment jsdom
import { vi } from "vitest";
import { getCurrentSessionId, setSessionIdIfNotDefined, clearCurrentSessionId, setCurrentSessionId } from "src/frontend/data/session";

describe("session", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  describe("getCurrentSessionId", () => {
    test("returns empty string when no session is set", () => {
      expect(getCurrentSessionId()).toBe("");
    });

    test("returns the stored session id", () => {
      setCurrentSessionId("my-session-42", true);
      expect(getCurrentSessionId()).toBe("my-session-42");
    });
  });

  describe("setSessionIdIfNotDefined", () => {
    test("sets session id when none exists", () => {
      setSessionIdIfNotDefined("fallback-session");
      expect(getCurrentSessionId()).toBe("fallback-session");
    });

    test("does not overwrite existing session id", () => {
      setCurrentSessionId("existing-session", true);
      setSessionIdIfNotDefined("fallback-session");
      expect(getCurrentSessionId()).toBe("existing-session");
    });
  });

  describe("clearCurrentSessionId", () => {
    test("removes session id", () => {
      setCurrentSessionId("to-be-cleared", true);
      clearCurrentSessionId();
      expect(getCurrentSessionId()).toBe("");
    });

    test("clears other session config items", () => {
      sessionStorage.setItem("clientConfig/cache.treeVisibles", '{"a":true}');
      setCurrentSessionId("my-session", true);
      clearCurrentSessionId();
      expect(sessionStorage.getItem("clientConfig/cache.treeVisibles")).toBeNull();
    });
  });

  describe("setCurrentSessionId", () => {
    test("sets the session id", () => {
      setCurrentSessionId("test-session-123", true);
      expect(getCurrentSessionId()).toBe("test-session-123");
    });

    test("clears previous session config before setting new id", () => {
      sessionStorage.setItem("clientConfig/cache.treeVisibles", '{"old":true}');
      setCurrentSessionId("new-session", true);
      expect(sessionStorage.getItem("clientConfig/cache.treeVisibles")).toBeNull();
      expect(getCurrentSessionId()).toBe("new-session");
    });

    test("overwrites existing session id", () => {
      setCurrentSessionId("first-session", true);
      setCurrentSessionId("second-session", true);
      expect(getCurrentSessionId()).toBe("second-session");
    });
  });
});
