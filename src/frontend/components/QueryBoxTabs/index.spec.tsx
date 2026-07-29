// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const useConnectionQueriesMock = vi.fn();
const useCommandsMock = vi.fn();
const useQueryTabOrientationSettingMock = vi.fn();
const useIsQueryTabAutoSaveEnabledMock = vi.fn();
const toggleMenuItemsMock = vi.fn();

vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useConnectionQueries: () => useConnectionQueriesMock(),
}));
vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => useCommandsMock(),
  allMenuKeys: ["k1", "k2"],
}));
vi.mock("src/frontend/hooks/useSetting", () => ({
  useQueryTabOrientationSetting: () => useQueryTabOrientationSettingMock(),
  useIsQueryTabAutoSaveEnabled: () => useIsQueryTabAutoSaveEnabledMock(),
}));
vi.mock("src/frontend/platform", () => ({
  platform: { toggleMenuItems: (...a: any[]) => toggleMenuItemsMock(...a) },
}));
vi.mock("src/frontend/components/QueryBox", () => ({
  default: ({ queryId }: any) => <div>QueryBox:{queryId}</div>,
}));
vi.mock("src/frontend/components/Tabs", () => ({
  default: ({ tabHeaders, tabContents, tabKeys }: any) => (
    <div data-testid="tabs">
      <div>headers:{tabHeaders.length}</div>
      <div>contents:{tabContents.length}</div>
      <div data-testid="tab-keys">{JSON.stringify(tabKeys)}</div>
    </div>
  ),
}));
vi.mock("src/frontend/components/DropdownButton", () => ({
  default: ({ children, options }: any) => (
    <span>
      {children}
      <span data-testid="opts">{options.length}</span>
    </span>
  ),
}));

import QueryBoxTabs from "src/frontend/components/QueryBoxTabs";

beforeEach(() => {
  useCommandsMock.mockReturnValue({ selectCommand: vi.fn() });
  useQueryTabOrientationSettingMock.mockReturnValue("horizontal");
  useIsQueryTabAutoSaveEnabledMock.mockReturnValue(true);
  toggleMenuItemsMock.mockClear();
});

describe("QueryBoxTabs", () => {
  test("loading state shows Loading...", () => {
    useConnectionQueriesMock.mockReturnValue({ queries: undefined, isLoading: true, onSaveQueries: vi.fn() });
    const { container } = render(<QueryBoxTabs />);
    expect(container.textContent).toContain("Loading");
  });

  test("empty queries calls selectCommand for /query/new and re-renders empty state", () => {
    const selectCommand = vi.fn();
    useCommandsMock.mockReturnValue({ selectCommand });
    useConnectionQueriesMock.mockReturnValue({ queries: [], isLoading: false, onSaveQueries: vi.fn() });
    const { container } = render(<QueryBoxTabs />);
    // First render triggers useEffect to add a query; UI still shows empty alert
    expect(container.textContent).toContain("No Query Yet");
    expect(selectCommand).toHaveBeenCalledWith({ event: "clientEvent/query/new" });
  });

  test("renders Tabs when queries exist", () => {
    useConnectionQueriesMock.mockReturnValue({
      queries: [
        { id: "q1", name: "T1", selected: true },
        { id: "q2", name: "T2", pinned: true, executing: true },
      ],
      isLoading: false,
      onSaveQueries: vi.fn(),
    });
    const { container } = render(<QueryBoxTabs />);
    expect(container.textContent).toContain("headers:3");
    expect(container.textContent).toContain("contents:2");
  });

  test("passes stable per-query tab keys so tab state cannot stick to the wrong query", () => {
    // keying tabs by index made DropdownButton `open` state follow the slot, not the query,
    // after a duplicate/close/reorder
    useConnectionQueriesMock.mockReturnValue({
      queries: [
        { id: "q1", name: "T1", selected: true },
        { id: "q2", name: "T2" },
      ],
      isLoading: false,
      onSaveQueries: vi.fn(),
    });
    const { getByTestId } = render(<QueryBoxTabs />);
    expect(JSON.parse(getByTestId("tab-keys").textContent || "null")).toEqual(["q1", "q2", "add-query"]);
  });

  test("auto-save flip from false to true triggers onSaveQueries", () => {
    const onSaveQueries = vi.fn().mockResolvedValue(undefined);
    useIsQueryTabAutoSaveEnabledMock.mockReturnValue(false);
    useConnectionQueriesMock.mockReturnValue({
      queries: [{ id: "q1", name: "T1", selected: true }],
      isLoading: false,
      onSaveQueries,
    });
    const { rerender } = render(<QueryBoxTabs />);
    expect(onSaveQueries).not.toHaveBeenCalled();
    useIsQueryTabAutoSaveEnabledMock.mockReturnValue(true);
    rerender(<QueryBoxTabs />);
    expect(onSaveQueries).toHaveBeenCalled();
  });

  test("toggles electron menu items on mount/unmount", () => {
    useConnectionQueriesMock.mockReturnValue({
      queries: [{ id: "q1", name: "T1", selected: true }],
      isLoading: false,
      onSaveQueries: vi.fn(),
    });
    const { unmount } = render(<QueryBoxTabs />);
    expect(toggleMenuItemsMock).toHaveBeenCalledWith(true, ["k1", "k2"]);
    unmount();
    expect(toggleMenuItemsMock).toHaveBeenCalledWith(false, ["k1", "k2"]);
  });
});
