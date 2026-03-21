// @vitest-environment jsdom
import {
  getToastHistory,
  dismissHistoryEntry,
  dismissAllHistoryEntries,
  setMaxToasts,
  ToastHistoryEntry,
} from "src/frontend/hooks/useToaster";

/**
 * Manually injects a toast history entry into the history array for testing purposes.
 * Since _addToast is not exported, we push directly into the array returned by getToastHistory()
 * (which is a reference to the module-level _toastHistory array).
 */
function injectHistoryEntry(entry: ToastHistoryEntry): void {
  getToastHistory().push(entry);
}

/** Creates a fake ToastHistoryEntry with sensible defaults. */
function makeEntry(overrides: Partial<ToastHistoryEntry> = {}): ToastHistoryEntry {
  return {
    id: overrides.id ?? "test-id",
    message: overrides.message ?? "test message",
    createdTime: overrides.createdTime ?? Date.now(),
    detail: overrides.detail,
    metadata: overrides.metadata,
    dismissTime: overrides.dismissTime,
    dismissTriggered: overrides.dismissTriggered,
  };
}

beforeEach(() => {
  // Always start with a clean slate
  dismissAllHistoryEntries();
});

describe("getToastHistory", () => {
  test("returns an array", () => {
    const history = getToastHistory();
    expect(Array.isArray(history)).toBeTruthy();
  });

  test("returns empty array when no entries exist", () => {
    expect(getToastHistory()).toHaveLength(0);
  });

  test("returns entries that have been injected", () => {
    const entry = makeEntry({ id: "a1", createdTime: 1000 });
    injectHistoryEntry(entry);

    const history = getToastHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("a1");
    expect(history[0].createdTime).toBe(1000);
  });

  test("preserves entry fields including detail and metadata", () => {
    const entry = makeEntry({
      id: "detailed",
      message: "hello",
      detail: "some detail",
      metadata: { key: "value" },
      createdTime: 2000,
      dismissTime: 3000,
      dismissTriggered: "user",
    });
    injectHistoryEntry(entry);

    const history = getToastHistory();
    expect(history).toHaveLength(1);
    expect(history[0].detail).toBe("some detail");
    expect(history[0].metadata).toEqual({ key: "value" });
    expect(history[0].dismissTime).toBe(3000);
    expect(history[0].dismissTriggered).toBe("user");
  });

  test("returns multiple entries in insertion order", () => {
    injectHistoryEntry(makeEntry({ id: "first", createdTime: 100 }));
    injectHistoryEntry(makeEntry({ id: "second", createdTime: 200 }));
    injectHistoryEntry(makeEntry({ id: "third", createdTime: 300 }));

    const history = getToastHistory();
    expect(history).toHaveLength(3);
    expect(history[0].id).toBe("first");
    expect(history[1].id).toBe("second");
    expect(history[2].id).toBe("third");
  });
});

describe("dismissAllHistoryEntries", () => {
  test("clears history when it has entries", () => {
    injectHistoryEntry(makeEntry({ id: "x1", createdTime: 100 }));
    injectHistoryEntry(makeEntry({ id: "x2", createdTime: 200 }));
    expect(getToastHistory()).toHaveLength(2);

    dismissAllHistoryEntries();
    expect(getToastHistory()).toHaveLength(0);
  });

  test("is safe to call when history is already empty", () => {
    expect(getToastHistory()).toHaveLength(0);
    dismissAllHistoryEntries();
    expect(getToastHistory()).toHaveLength(0);
  });

  test("can be called multiple times without error", () => {
    injectHistoryEntry(makeEntry({ createdTime: 100 }));
    dismissAllHistoryEntries();
    dismissAllHistoryEntries();
    dismissAllHistoryEntries();
    expect(getToastHistory()).toHaveLength(0);
  });

  test("subsequent getToastHistory calls return empty after clear", () => {
    injectHistoryEntry(makeEntry({ createdTime: 500 }));
    dismissAllHistoryEntries();

    // Calling again should still be empty (not restored)
    expect(getToastHistory()).toHaveLength(0);
    expect(getToastHistory()).toEqual([]);
  });
});

describe("dismissHistoryEntry", () => {
  test("removes entry matching the given createdTime", () => {
    injectHistoryEntry(makeEntry({ id: "keep", createdTime: 100 }));
    injectHistoryEntry(makeEntry({ id: "remove", createdTime: 200 }));
    injectHistoryEntry(makeEntry({ id: "keep2", createdTime: 300 }));

    dismissHistoryEntry(200);

    const history = getToastHistory();
    expect(history).toHaveLength(2);
    expect(history.map((h) => h.id)).toEqual(["keep", "keep2"]);
  });

  test("does nothing when no entry matches the createdTime", () => {
    injectHistoryEntry(makeEntry({ id: "a", createdTime: 100 }));
    injectHistoryEntry(makeEntry({ id: "b", createdTime: 200 }));

    dismissHistoryEntry(999);

    expect(getToastHistory()).toHaveLength(2);
  });

  test("is safe to call on empty history", () => {
    expect(getToastHistory()).toHaveLength(0);
    dismissHistoryEntry(12345);
    expect(getToastHistory()).toHaveLength(0);
  });

  test("removes all entries with matching createdTime (duplicate timestamps)", () => {
    const sameTime = 500;
    injectHistoryEntry(makeEntry({ id: "dup1", createdTime: sameTime }));
    injectHistoryEntry(makeEntry({ id: "dup2", createdTime: sameTime }));
    injectHistoryEntry(makeEntry({ id: "other", createdTime: 600 }));

    dismissHistoryEntry(sameTime);

    const history = getToastHistory();
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("other");
  });

  test("removes only the targeted entry, leaving others intact", () => {
    injectHistoryEntry(makeEntry({ id: "a", createdTime: 10, message: "msg-a" }));
    injectHistoryEntry(makeEntry({ id: "b", createdTime: 20, message: "msg-b" }));
    injectHistoryEntry(makeEntry({ id: "c", createdTime: 30, message: "msg-c" }));

    dismissHistoryEntry(20);

    const history = getToastHistory();
    expect(history).toHaveLength(2);
    expect(history[0].message).toBe("msg-a");
    expect(history[1].message).toBe("msg-c");
  });

  test("can dismiss entries sequentially until history is empty", () => {
    injectHistoryEntry(makeEntry({ id: "x", createdTime: 1 }));
    injectHistoryEntry(makeEntry({ id: "y", createdTime: 2 }));
    injectHistoryEntry(makeEntry({ id: "z", createdTime: 3 }));

    dismissHistoryEntry(1);
    expect(getToastHistory()).toHaveLength(2);

    dismissHistoryEntry(2);
    expect(getToastHistory()).toHaveLength(1);

    dismissHistoryEntry(3);
    expect(getToastHistory()).toHaveLength(0);
  });

  test("calling dismiss for same createdTime twice is safe", () => {
    injectHistoryEntry(makeEntry({ id: "once", createdTime: 42 }));

    dismissHistoryEntry(42);
    expect(getToastHistory()).toHaveLength(0);

    dismissHistoryEntry(42);
    expect(getToastHistory()).toHaveLength(0);
  });
});

describe("setMaxToasts", () => {
  test("does not throw when called with a positive number", () => {
    expect(() => setMaxToasts(5)).not.toThrow();
  });

  test("does not throw when called with zero", () => {
    expect(() => setMaxToasts(0)).not.toThrow();
  });

  test("does not throw when called with a large number", () => {
    expect(() => setMaxToasts(1000)).not.toThrow();
  });

  test("does not throw when called with 1", () => {
    expect(() => setMaxToasts(1)).not.toThrow();
  });

  test("can be called multiple times in succession", () => {
    expect(() => {
      setMaxToasts(1);
      setMaxToasts(10);
      setMaxToasts(3);
      setMaxToasts(100);
    }).not.toThrow();
  });

  test("does not affect existing toast history", () => {
    injectHistoryEntry(makeEntry({ id: "persist", createdTime: 777 }));

    setMaxToasts(1);

    // setMaxToasts only governs active toasts, not history
    expect(getToastHistory()).toHaveLength(1);
    expect(getToastHistory()[0].id).toBe("persist");
  });
});

describe("interactions between helpers", () => {
  test("dismissHistoryEntry followed by dismissAllHistoryEntries leaves empty history", () => {
    injectHistoryEntry(makeEntry({ id: "a", createdTime: 10 }));
    injectHistoryEntry(makeEntry({ id: "b", createdTime: 20 }));

    dismissHistoryEntry(10);
    expect(getToastHistory()).toHaveLength(1);

    dismissAllHistoryEntries();
    expect(getToastHistory()).toHaveLength(0);
  });

  test("dismissAllHistoryEntries followed by injecting new entries works", () => {
    injectHistoryEntry(makeEntry({ id: "old", createdTime: 1 }));
    dismissAllHistoryEntries();
    expect(getToastHistory()).toHaveLength(0);

    // After clearing, new entries can still be added
    // (This verifies the array reference is replaced, not just emptied)
    // Note: since dismissAll replaces _toastHistory, we must get the new reference
    const newHistory = getToastHistory();
    newHistory.push(makeEntry({ id: "new", createdTime: 2 }));
    expect(getToastHistory()).toHaveLength(1);
    expect(getToastHistory()[0].id).toBe("new");
  });

  test("setMaxToasts does not interfere with history operations", () => {
    setMaxToasts(2);

    injectHistoryEntry(makeEntry({ id: "h1", createdTime: 100 }));
    injectHistoryEntry(makeEntry({ id: "h2", createdTime: 200 }));
    injectHistoryEntry(makeEntry({ id: "h3", createdTime: 300 }));

    // History is independent of maxToasts (maxToasts limits active toasts only)
    expect(getToastHistory()).toHaveLength(3);

    dismissHistoryEntry(200);
    expect(getToastHistory()).toHaveLength(2);

    dismissAllHistoryEntries();
    expect(getToastHistory()).toHaveLength(0);
  });
});
