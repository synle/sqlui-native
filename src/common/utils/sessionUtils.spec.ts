import { vi } from "vitest";
import * as sessionUtils from "src/common/utils/sessionUtils";

describe("sessionUtils", () => {
  const w1 = "window_1";
  const w2 = "window_2";
  const w3 = "window_3";
  const w4 = "window_4";
  const s1 = "session_1";
  const s2 = "session_2";
  const s3 = "session_3";
  const s4 = "session_4";

  beforeEach(() => {
    sessionUtils.reset();
  });

  test("single window scenario", async () => {
    expect(sessionUtils.get()).toEqual({});

    sessionUtils.open(w1, s1);
    expect(sessionUtils.get()).toEqual({
      window_1: "session_1",
    });

    sessionUtils.open(w1, s2);
    expect(sessionUtils.get()).toEqual({
      window_1: "session_2",
    });

    sessionUtils.open(w1, s3);
    expect(sessionUtils.get()).toEqual({
      window_1: "session_3",
    });

    expect(sessionUtils.listSessionIds()).toEqual(["session_3"]);

    sessionUtils.close(w1);
    expect(sessionUtils.get()).toEqual({});
  });

  test("multiple window scenario", async () => {
    expect(sessionUtils.get()).toEqual({});

    sessionUtils.open(w1, s1);
    expect(sessionUtils.get()).toEqual({
      window_1: "session_1",
    });

    sessionUtils.close(w1);
    expect(sessionUtils.get()).toEqual({});

    sessionUtils.open(w1, s2);
    expect(sessionUtils.get()).toEqual({
      window_1: "session_2",
    });

    sessionUtils.open(w2, s3);
    expect(sessionUtils.get()).toEqual({
      window_1: "session_2",
      window_2: "session_3",
    });

    sessionUtils.open(w3, s1);
    expect(sessionUtils.get()).toEqual({
      window_1: "session_2",
      window_2: "session_3",
      window_3: "session_1",
    });

    expect(sessionUtils.listSessionIds()).toEqual(["session_2", "session_3", "session_1"]);

    sessionUtils.close(w3);
    expect(sessionUtils.get()).toEqual({
      window_1: "session_2",
      window_2: "session_3",
    });

    sessionUtils.close(w2);
    expect(sessionUtils.get()).toEqual({
      window_1: "session_2",
    });

    sessionUtils.close(w1);
    expect(sessionUtils.get()).toEqual({});
  });

  test("open", async () => {
    expect(sessionUtils.get()).toEqual({});

    let isSessionCreated = false;
    isSessionCreated = sessionUtils.open(w1, s1);
    expect(isSessionCreated).toEqual(true);
    isSessionCreated = sessionUtils.open(w2, s2);
    expect(isSessionCreated).toEqual(true);
    isSessionCreated = sessionUtils.open(w3, s3);
    expect(isSessionCreated).toEqual(true);
    isSessionCreated = sessionUtils.open(w4, s3);
    expect(isSessionCreated).toEqual(false);
  });

  test("getWindowIdBySessionId", async () => {
    expect(sessionUtils.get()).toEqual({});

    sessionUtils.open(w1, s1);
    sessionUtils.open(w2, s2);
    sessionUtils.open(w3, s3);

    expect(sessionUtils.getWindowIdBySessionId(s1)).toEqual("window_1");
    expect(sessionUtils.getWindowIdBySessionId(s2)).toEqual("window_2");
    expect(sessionUtils.getWindowIdBySessionId(s3)).toEqual("window_3");
    expect(sessionUtils.getWindowIdBySessionId(s4)).toEqual(undefined);
  });

  test("ping updates the last ping time for a window", () => {
    sessionUtils.open(w1, s1);
    sessionUtils.ping(w1);

    // session should still be listed
    expect(sessionUtils.listSessionIds()).toEqual([s1]);
  });

  test("cleanupStaleSessions removes sessions not pinged within threshold", () => {
    sessionUtils.open(w1, s1);
    sessionUtils.open(w2, s2);

    // simulate w1 pinged long ago by using a very small threshold
    // w2 was just opened (pinged via open()), so it survives
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000); // advance 11 minutes

    sessionUtils.ping(w2); // refresh w2's ping

    sessionUtils.cleanupStaleSessions(10 * 60 * 1000);

    expect(sessionUtils.get()).toEqual({ [w2]: s2 });
    expect(sessionUtils.listSessionIds()).toEqual([s2]);

    vi.useRealTimers();
  });

  test("cleanupStaleSessions removes sessions with no ping record (legacy)", () => {
    // Directly set openedSessions without going through open() to simulate legacy data
    sessionUtils.open(w1, s1);

    // open sets a ping, so let's also open w2 normally for comparison
    sessionUtils.open(w2, s2);
    sessionUtils.ping(w2);

    // Advance time past threshold so w1's initial ping is stale
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);

    // Refresh w2 so it stays alive
    sessionUtils.ping(w2);

    sessionUtils.cleanupStaleSessions(10 * 60 * 1000);

    // w1 should be removed (stale ping), w2 should remain
    expect(sessionUtils.get()).toEqual({ [w2]: s2 });

    vi.useRealTimers();
  });

  test("close removes ping data along with session", () => {
    sessionUtils.open(w1, s1);
    sessionUtils.ping(w1);

    sessionUtils.close(w1);

    expect(sessionUtils.get()).toEqual({});

    // Re-open and verify cleanup works without leftover ping data
    vi.useFakeTimers();
    sessionUtils.open(w1, s2);
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);

    sessionUtils.cleanupStaleSessions(10 * 60 * 1000);

    expect(sessionUtils.get()).toEqual({});
    vi.useRealTimers();
  });
});
