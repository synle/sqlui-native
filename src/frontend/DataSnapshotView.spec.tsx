// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";

const useGetDataSnapshotMock = vi.fn();
const useActionDialogsMock = vi.fn();
const useToasterMock = vi.fn();

vi.mock("src/frontend/hooks/useDataSnapshot", () => ({
  useGetDataSnapshot: () => useGetDataSnapshotMock(),
}));
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => useActionDialogsMock(),
}));
vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => useToasterMock(),
}));
vi.mock("src/frontend/data/file", () => ({
  downloadCsv: vi.fn(),
  downloadJSON: vi.fn(),
}));
vi.mock("src/frontend/components/DataTable", () => ({
  DataTableWithJSONList: ({ data }: any) => <div>DataTableWithJSONList:{data?.length ?? 0}</div>,
}));

import DataSnapshotView from "src/frontend/DataSnapshotView";

beforeEach(() => {
  useActionDialogsMock.mockReturnValue({
    prompt: vi.fn().mockResolvedValue(undefined),
    modal: vi.fn().mockResolvedValue(undefined),
  });
  useToasterMock.mockReturnValue({ add: vi.fn() });
});

describe("DataSnapshotView", () => {
  test("loading state shows Loading", () => {
    useGetDataSnapshotMock.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(
      <MemoryRouter>
        <DataSnapshotView />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Loading");
  });

  test("no data renders error alert", () => {
    useGetDataSnapshotMock.mockReturnValue({ data: undefined, isLoading: false });
    const { container } = render(
      <MemoryRouter>
        <DataSnapshotView />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("No data for this snapshot");
  });

  test("renders DataTableWithJSONList when data exists", () => {
    useGetDataSnapshotMock.mockReturnValue({
      data: {
        id: "s1",
        location: "/tmp/a",
        description: "Snap 1",
        createdAt: Date.now(),
        values: [{ a: 1 }, { a: 2 }],
      },
      isLoading: false,
    });
    const { container } = render(
      <MemoryRouter>
        <DataSnapshotView />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("DataTableWithJSONList:2");
    expect(document.title).toContain("Snapshot");
  });
});
