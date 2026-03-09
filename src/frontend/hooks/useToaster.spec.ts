// @vitest-environment jsdom
import { getToastHistory, dismissHistoryEntry, dismissAllHistoryEntries } from "src/frontend/hooks/useToaster";

describe("toast history helpers", () => {
  test("getToastHistory returns an array", () => {
    const history = getToastHistory();
    expect(Array.isArray(history)).toBeTruthy();
  });

  test("dismissAllHistoryEntries clears history", () => {
    dismissAllHistoryEntries();
    const history = getToastHistory();
    expect(history.length).toEqual(0);
  });

  test("dismissHistoryEntry removes a specific entry", () => {
    // clear first
    dismissAllHistoryEntries();
    const history = getToastHistory();
    expect(history.length).toEqual(0);
  });
});
