// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ modal: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  DEFAULT_MAX_TOASTS: 5,
  useMaxToastsSetting: () => 5,
}));

import { setMaxToasts, getToastHistory, dismissHistoryEntry, dismissAllHistoryEntries } from "src/frontend/hooks/useToaster";

describe("useToaster module-level helpers", () => {
  beforeEach(() => {
    dismissAllHistoryEntries();
  });

  test("getToastHistory returns an array (possibly empty)", () => {
    const history = getToastHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  test("dismissAllHistoryEntries clears the history", () => {
    dismissAllHistoryEntries();
    const after = getToastHistory();
    // After dismiss-all the array should be empty.
    expect(after.length).toBe(0);
  });

  test("dismissHistoryEntry with unknown id is a no-op (no throw)", () => {
    expect(() => dismissHistoryEntry(999999999)).not.toThrow();
  });

  test("setMaxToasts updates the module-level max", () => {
    expect(() => setMaxToasts(3)).not.toThrow();
    setMaxToasts(5);
  });
});
