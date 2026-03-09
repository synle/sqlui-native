// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/hooks/useToaster", () => ({
  getToastHistory: () => [],
  dismissHistoryEntry: vi.fn(),
  dismissAllHistoryEntries: vi.fn(),
  useToastHistoryCount: () => 0,
}));

import ToastHistoryList from "src/frontend/components/ToastHistoryList";

describe("ToastHistoryList", () => {
  test("shows empty state message when no history", () => {
    const { container } = render(<ToastHistoryList />);
    expect(container.textContent).toContain("No notifications yet");
  });
});
