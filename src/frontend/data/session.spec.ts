// @vitest-environment jsdom
import { vi } from "vitest";
import { getRandomSessionId, setCurrentSessionId } from "src/frontend/data/session";

describe("getRandomSessionId", () => {
  test("returns a string containing sessionId", () => {
    const id = getRandomSessionId();
    expect(id).toContain("sessionId");
  });

  test("returns unique values on each call", () => {
    const id1 = getRandomSessionId();
    const id2 = getRandomSessionId();
    expect(id1).not.toEqual(id2);
  });
});

describe("setCurrentSessionId", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  test("sets the session id in sessionStorage", () => {
    setCurrentSessionId("test-session-123", true);
    expect(sessionStorage.getItem("sqlui-native.sessionId")).toContain("test-session-123");
  });

  test("preserves windowId after setting session", () => {
    sessionStorage.setItem("sqlui-native.windowId", "window-42");
    setCurrentSessionId("test-session-456", true);
    expect(sessionStorage.getItem("sqlui-native.windowId")).toContain("window-42");
  });
});
