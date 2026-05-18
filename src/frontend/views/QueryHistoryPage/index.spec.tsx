// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";

const useGetQueryVersionHistoryMock = vi.fn();

vi.mock("src/frontend/components/Breadcrumbs", () => ({ default: () => <div>Breadcrumbs</div> }));
vi.mock("src/frontend/components/VirtualizedConnectionTree", () => ({ default: () => <div>Tree</div> }));
vi.mock("src/frontend/components/NewConnectionButton", () => ({ default: () => <div>NewConn</div> }));
vi.mock("src/frontend/components/DataTable", () => ({ default: () => <div>DataTable</div> }));
vi.mock("src/frontend/components/DateCell", () => ({ default: () => <div>Date</div> }));
vi.mock("src/frontend/layout/LayoutTwoColumns", () => ({
  default: (props: any) => <div>{props.children}</div>,
}));
vi.mock("src/frontend/hooks/useClientSidePreference", () => ({
  useSideBarWidthPreference: () => ({ value: 300, onChange: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({ data: { showContextMenu: true }, setTreeActions: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ confirm: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnections: () => ({ data: [] }),
}));
vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useConnectionQueries: () => ({ onAddQuery: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useQueryVersionHistory", () => ({
  useGetQueryVersionHistory: () => useGetQueryVersionHistoryMock(),
  useClearQueryVersionHistory: () => ({ mutateAsync: vi.fn() }),
  useDeleteQueryVersionHistory: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: vi.fn() }),
}));

import QueryHistoryPage from "src/frontend/views/QueryHistoryPage";

beforeEach(() => {
  useGetQueryVersionHistoryMock.mockReturnValue({ data: [], isLoading: false });
});

describe("QueryHistoryPage", () => {
  test("renders breadcrumbs + tree even when empty", () => {
    const { container } = render(
      <MemoryRouter>
        <QueryHistoryPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Breadcrumbs");
    expect(container.textContent).toContain("Tree");
    expect(container.textContent).toContain("NewConn");
  });

  test("loading state shows Loading", () => {
    useGetQueryVersionHistoryMock.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(
      <MemoryRouter>
        <QueryHistoryPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Loading");
  });

  test("empty entries shows 'No query history yet...'", () => {
    useGetQueryVersionHistoryMock.mockReturnValue({ data: [], isLoading: false });
    const { container } = render(
      <MemoryRouter>
        <QueryHistoryPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("No query history yet");
  });

  test("with entries renders DataTable and Clear button", () => {
    useGetQueryVersionHistoryMock.mockReturnValue({
      data: [
        {
          id: "h1",
          type: "execution",
          name: "test",
          data: { connectionId: "c1", sql: "SELECT 1" },
          createdAt: Date.now(),
        },
        {
          id: "h2",
          type: "delta",
          name: "delta-test",
          data: { connectionId: "c2", sql: "UPDATE foo" },
          createdAt: Date.now() - 1000,
        },
      ],
      isLoading: false,
    });
    const { container } = render(
      <MemoryRouter>
        <QueryHistoryPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Clear History");
    expect(container.textContent).toContain("DataTable");
  });
});
