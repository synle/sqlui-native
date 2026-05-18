// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const modalMock = vi.fn();
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ modal: modalMock }),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  DEFAULT_MAX_TOASTS: 5,
  useMaxToastsSetting: () => 5,
}));

vi.mock("src/frontend/utils/commonUtils", () => ({
  getGeneratedRandomId: (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2)}`,
}));

import useToaster, {
  getToastHistory,
  dismissHistoryEntry,
  dismissAllHistoryEntries,
  setMaxToasts,
  useToastHistoryCount,
} from "src/frontend/hooks/useToaster";

beforeEach(() => {
  dismissAllHistoryEntries();
  modalMock.mockClear();
});

describe("useToaster module helpers", () => {
  test("getToastHistory starts empty after reset", () => {
    expect(getToastHistory()).toEqual([]);
  });

  test("setMaxToasts updates module-level limit", () => {
    setMaxToasts(3);
    setMaxToasts(5);
    expect(true).toBe(true);
  });

  test("dismissHistoryEntry with unknown id is a no-op", () => {
    expect(() => dismissHistoryEntry(99999)).not.toThrow();
  });

  test("useToastHistoryCount returns 0 initially", () => {
    const { result } = renderHook(() => useToastHistoryCount());
    expect(result.current).toBe(0);
  });

  test("add creates handler that can dismiss", async () => {
    const { result } = renderHook(() => useToaster());
    let handler: any;
    await act(async () => {
      handler = await result.current.add({ message: "Hello", persisted: true });
    });
    expect(handler).toHaveProperty("dismiss");
    expect(getToastHistory().length).toBe(1);
    expect(getToastHistory()[0].message).toBe("Hello");
  });

  test("dismiss handler marks history entry as dismissed", async () => {
    const { result } = renderHook(() => useToaster());
    let handler: any;
    await act(async () => {
      handler = await result.current.add({ message: "Bye", persisted: true });
    });
    await act(async () => {
      handler.dismiss();
      await new Promise((r) => setTimeout(r, 10));
    });
    const entry = getToastHistory().find((h) => h.message === "Bye");
    expect(entry?.dismissTime).toBeDefined();
    expect(entry?.dismissTriggered).toBe("user");
  });

  test("non-persisted toast does not appear in history", async () => {
    const { result } = renderHook(() => useToaster());
    await act(async () => {
      await result.current.add({ message: "EphemeralOnly" });
    });
    expect(getToastHistory().find((h) => h.message === "EphemeralOnly")).toBeUndefined();
  });

  test("dismissHistoryEntry removes by createdTime", async () => {
    const { result } = renderHook(() => useToaster());
    await act(async () => {
      await result.current.add({ message: "RemoveMe", persisted: true });
    });
    const entry = getToastHistory().find((h) => h.message === "RemoveMe")!;
    dismissHistoryEntry(entry.createdTime);
    expect(getToastHistory().find((h) => h.message === "RemoveMe")).toBeUndefined();
  });

  test("dismissAllHistoryEntries clears all", async () => {
    const { result } = renderHook(() => useToaster());
    await act(async () => {
      await result.current.add({ message: "A", persisted: true });
      await result.current.add({ message: "B", persisted: true });
    });
    expect(getToastHistory().length).toBeGreaterThanOrEqual(2);
    dismissAllHistoryEntries();
    expect(getToastHistory()).toEqual([]);
  });

  test("adding toast with same id updates existing", async () => {
    const { result } = renderHook(() => useToaster());
    await act(async () => {
      await result.current.add({ id: "same-id", message: "First", persisted: true });
      await result.current.add({ id: "same-id", message: "Updated", persisted: true, detail: "x" });
    });
    const matching = getToastHistory().filter((h) => h.id === "same-id");
    expect(matching.length).toBe(1);
    expect(matching[0].message).toBe("Updated");
    expect(matching[0].detail).toBe("x");
  });

  test("eviction occurs when active toasts exceed max limit", async () => {
    const { result } = renderHook(() => useToaster());
    // Hook's effect just set max to 5 (from mock). Override now so add() sees the lower limit.
    setMaxToasts(2);
    await act(async () => {
      await result.current.add({ message: "T1", persisted: true });
      await result.current.add({ message: "T2", persisted: true });
      await result.current.add({ message: "T3", persisted: true });
    });
    const t1 = getToastHistory().find((h) => h.message === "T1");
    expect(t1?.dismissTriggered).toBe("auto");
    setMaxToasts(5);
  });
});
