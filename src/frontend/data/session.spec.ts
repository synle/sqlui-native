// @vitest-environment jsdom
import { vi } from "vitest";
import { setCurrentSessionId } from "src/frontend/data/session";

describe("setCurrentSessionId", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  test("sets the session id in sessionStorage", () => {
    setCurrentSessionId("test-session-123", true);
    expect(sessionStorage.getItem("sqlui-native.sessionId")).toContain("test-session-123");
  });
});
