// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";

const useGetDataSnapshotsMock = vi.fn();

vi.mock("src/frontend/hooks/useDataSnapshot", () => ({
  useGetDataSnapshots: () => useGetDataSnapshotsMock(),
  useDeleteDataSnapshot: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ confirm: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock("src/frontend/components/DataTable", () => ({ default: () => <div>DataTable</div> }));
vi.mock("src/frontend/components/DateCell", () => ({ default: () => <span>Date</span> }));

import DataSnapshotListView from "src/frontend/DataSnapshotListView";

beforeEach(() => {
  useGetDataSnapshotsMock.mockReturnValue({ data: [], isLoading: false });
});

describe("DataSnapshotListView", () => {
  test("loading state", () => {
    useGetDataSnapshotsMock.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(
      <MemoryRouter>
        <DataSnapshotListView />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Loading");
  });

  test("empty data renders 'No data snapshot available'", () => {
    useGetDataSnapshotsMock.mockReturnValue({ data: [], isLoading: false });
    const { container } = render(
      <MemoryRouter>
        <DataSnapshotListView />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("No data snapshot available");
  });

  test("renders DataTable when data exists", () => {
    useGetDataSnapshotsMock.mockReturnValue({
      data: [
        { id: "s1", location: "/tmp/a", description: "Snap 1", createdAt: Date.now(), values: [] },
        { id: "s2", location: "/tmp/b", description: "", createdAt: Date.now() - 1000, values: [{}] },
      ],
      isLoading: false,
    });
    const { container } = render(
      <MemoryRouter>
        <DataSnapshotListView />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("DataTable");
  });

  test("sets document.title on mount", () => {
    useGetDataSnapshotsMock.mockReturnValue({ data: [], isLoading: false });
    render(
      <MemoryRouter>
        <DataSnapshotListView />
      </MemoryRouter>,
    );
    expect(document.title).toBe("Data Snapshots");
  });
});
