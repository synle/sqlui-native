// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const useVirtualizerMock = vi.fn();

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: (...args: any[]) => useVirtualizerMock(...args),
}));

const getToastHistoryMock = vi.fn();
const dismissHistoryEntryMock = vi.fn();
const dismissAllHistoryEntriesMock = vi.fn();
const useToastHistoryCountMock = vi.fn();

vi.mock("src/frontend/hooks/useToaster", () => ({
  getToastHistory: () => getToastHistoryMock(),
  dismissHistoryEntry: (...args: any[]) => dismissHistoryEntryMock(...args),
  dismissAllHistoryEntries: (...args: any[]) => dismissAllHistoryEntriesMock(...args),
  useToastHistoryCount: () => useToastHistoryCountMock(),
}));

import ToastHistoryList from "src/frontend/components/ToastHistoryList";

beforeEach(() => {
  useToastHistoryCountMock.mockReturnValue(2);
  useVirtualizerMock.mockImplementation(({ count }: any) => ({
    getTotalSize: () => count * 60,
    getVirtualItems: () => Array.from({ length: count }, (_, i) => ({ index: i, start: i * 60, size: 60 })),
    measure: vi.fn(),
    measureElement: vi.fn(),
  }));
});

describe("ToastHistoryList", () => {
  test("empty history shows 'No notifications yet.'", () => {
    getToastHistoryMock.mockReturnValue([]);
    useToastHistoryCountMock.mockReturnValue(0);
    const { container } = render(<ToastHistoryList />);
    expect(container.textContent).toContain("No notifications yet");
  });

  test("renders list of entries with filter / sort / Dismiss All", () => {
    getToastHistoryMock.mockReturnValue([
      { id: "t1", message: "Hello", createdTime: 1000 },
      { id: "t2", message: "World", createdTime: 2000, dismissTime: 3000, dismissTriggered: "user" },
    ]);
    const { container } = render(<ToastHistoryList />);
    expect(container.textContent).toContain("Hello");
    expect(container.textContent).toContain("World");
    expect(container.querySelector('input[placeholder="Filter notifications..."]')).toBeTruthy();
    expect(container.textContent).toContain("Dismiss All");
  });

  test("filter with no match shows 'No matching notifications.'", () => {
    getToastHistoryMock.mockReturnValue([{ id: "t1", message: "Alpha", createdTime: 1000 }]);
    const { container } = render(<ToastHistoryList />);
    const input = container.querySelector('input[placeholder="Filter notifications..."]')!;
    fireEvent.change(input, { target: { value: "Zzzz" } });
    expect(container.textContent).toContain("No matching notifications");
  });

  test("dismiss button triggers dismissHistoryEntry", () => {
    getToastHistoryMock.mockReturnValue([{ id: "t1", message: "Alpha", createdTime: 5555 }]);
    const { container } = render(<ToastHistoryList />);
    const dismissBtn = container.querySelector('[aria-label="Dismiss notification"]')!;
    fireEvent.click(dismissBtn);
    expect(dismissHistoryEntryMock).toHaveBeenCalledWith(5555);
  });

  test("Dismiss All triggers dismissAllHistoryEntries", () => {
    getToastHistoryMock.mockReturnValue([{ id: "t1", message: "Alpha", createdTime: 1 }]);
    const { getByText } = render(<ToastHistoryList />);
    fireEvent.click(getByText("Dismiss All"));
    expect(dismissAllHistoryEntriesMock).toHaveBeenCalled();
  });

  test("entries with detail/metadata show Expand All button and toggle", () => {
    getToastHistoryMock.mockReturnValue([
      {
        id: "t1",
        message: "Alpha",
        createdTime: 1,
        detail: "x".repeat(300),
        metadata: { k: "v" },
      },
    ]);
    const { container, getByText } = render(<ToastHistoryList />);
    expect(getByText("Expand All")).toBeTruthy();
    fireEvent.click(getByText("Expand All"));
    expect(container.textContent).toContain("Collapse All");
  });

  test("entry with long detail shows 'Show more' toggling to 'Show less'", () => {
    getToastHistoryMock.mockReturnValue([
      {
        id: "t1",
        message: "Alpha",
        createdTime: 1,
        detail: "x".repeat(300),
      },
    ]);
    const { container, getByText } = render(<ToastHistoryList />);
    fireEvent.click(getByText("Show more"));
    expect(container.textContent).toContain("Show less");
  });
});
