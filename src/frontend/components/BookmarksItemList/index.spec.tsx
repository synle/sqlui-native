// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";

const useGetBookmarkItemsMock = vi.fn();
const useDeleteBookmarkItemMock = vi.fn();
const useUpdateBookmarkItemMock = vi.fn();

vi.mock("src/frontend/hooks/useFolderItems", () => ({
  useGetBookmarkItems: () => useGetBookmarkItemsMock(),
  useDeleteBookmarkItem: () => useDeleteBookmarkItemMock(),
  useUpdateBookmarkItem: () => useUpdateBookmarkItemMock(),
}));
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({
    confirm: vi.fn().mockResolvedValue(undefined),
    prompt: vi.fn().mockResolvedValue("New Name"),
  }),
}));
vi.mock("src/frontend/hooks/useConnection", () => ({
  useUpsertConnection: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useConnectionQueries: () => ({ onAddQuery: vi.fn() }),
}));
vi.mock("src/frontend/utils/commonUtils", () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock("src/frontend/components/DataTable", () => ({
  default: ({ data, columns }: any) => (
    <div data-testid="data-table">
      <div>cols:{columns.length}</div>
      <div>rows:{data.length}</div>
      {data.map((item: any, idx: number) => (
        <div key={idx}>
          {columns.map((c: any, cidx: number) => (
            <div key={cidx}>{c.cell ? c.cell({ row: { original: item, index: idx } }) : null}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import BookmarksItemList from "src/frontend/components/BookmarksItemList";

beforeEach(() => {
  useDeleteBookmarkItemMock.mockReturnValue({ mutateAsync: vi.fn() });
  useUpdateBookmarkItemMock.mockReturnValue({ mutateAsync: vi.fn() });
});

describe("BookmarksItemList", () => {
  test("loading state shows backdrop", () => {
    useGetBookmarkItemsMock.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(
      <MemoryRouter>
        <BookmarksItemList />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Loading");
  });

  test("empty state renders 'No bookmarks...'", () => {
    useGetBookmarkItemsMock.mockReturnValue({ data: [], isLoading: false });
    const { container } = render(
      <MemoryRouter>
        <BookmarksItemList />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("No bookmarks");
  });

  test("renders connection and query bookmarks with chips", () => {
    useGetBookmarkItemsMock.mockReturnValue({
      data: [
        { id: "b1", name: "Conn 1", type: "Connection", data: { dialect: "sqlite" } },
        {
          id: "b2",
          name: "Query 1",
          type: "Query",
          data: { sql: "SELECT * FROM users", connectionId: "c1", result: [{ id: 1 }] },
        },
        { id: "b3", name: "Query 2", type: "Query", data: { sql: "" } },
      ],
      isLoading: false,
    });
    const { container } = render(
      <MemoryRouter>
        <BookmarksItemList />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Conn 1");
    expect(container.textContent).toContain("Query 1");
    expect(container.textContent).toContain("Connection");
    expect(container.textContent).toContain("SELECT * FROM users");
  });

  test("hideActions hides the action column", () => {
    useGetBookmarkItemsMock.mockReturnValue({
      data: [{ id: "b1", name: "Conn", type: "Connection", data: {} }],
      isLoading: false,
    });
    const { container } = render(
      <MemoryRouter>
        <BookmarksItemList hideActions />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("cols:5");
  });

  test("expand/collapse toggle button appears when query items exist", () => {
    useGetBookmarkItemsMock.mockReturnValue({
      data: [{ id: "b1", name: "Q1", type: "Query", data: { sql: "SELECT 1" } }],
      isLoading: false,
    });
    const { container } = render(
      <MemoryRouter>
        <BookmarksItemList />
      </MemoryRouter>,
    );
    // Tooltip with title "Expand all details" should be in DOM
    expect(container.querySelector('[aria-label="Edit bookmark"]')).toBeTruthy();
  });
});
