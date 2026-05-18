// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

const { openAppWindowMock, addDataSnapshotMock } = vi.hoisted(() => ({
  openAppWindowMock: vi.fn(),
  addDataSnapshotMock: vi.fn(),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  useLayoutModeSetting: () => "compact",
}));

vi.mock("src/frontend/hooks/useDataSnapshot", () => ({
  useAddDataSnapshot: () => ({ mutateAsync: addDataSnapshotMock }),
}));

vi.mock("src/frontend/platform", () => ({
  platform: { openAppWindow: openAppWindowMock, isDesktop: false },
}));

vi.mock("src/frontend/components/DataTable/DataTableColumnSettings", () => ({
  default: () => <div data-testid="col-settings">cs</div>,
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: any) => ({
    getTotalSize: () => count * 40,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({ index: i, start: i * 40, size: 40, key: `vi-${i}`, lane: 0, end: (i + 1) * 40 })),
    measure: vi.fn(),
    measureElement: vi.fn(),
    scrollToOffset: vi.fn(),
  }),
}));

import ModernDataTable from "src/frontend/components/DataTable/ModernDataTable";

describe("ModernDataTable", () => {
  test("renders basic columns and rows", () => {
    const columns = [
      { header: "Name", accessorKey: "name" },
      { header: "Age", accessorKey: "age" },
    ];
    const data = [
      { name: "Acme", age: 100 },
      { name: "Globex", age: 50 },
    ];
    const { container } = render(<ModernDataTable columns={columns as any} data={data as any} />);
    expect(container.textContent).toContain("Name");
    expect(container.textContent).toContain("Age");
  });

  test("renders empty data", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const { container } = render(<ModernDataTable columns={columns as any} data={[] as any} />);
    expect(container.textContent).toContain("Name");
  });

  test("empty data shows 'no data' message", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const { container } = render(<ModernDataTable columns={columns as any} data={[] as any} />);
    expect(container.textContent).toContain("no data");
  });

  test("renders with searchInputId", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const { container } = render(<ModernDataTable columns={columns as any} data={data as any} searchInputId="search-1" />);
    expect(container.textContent).toContain("Acme");
  });

  test("searchInputId renders a GlobalFilter input", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const { container } = render(<ModernDataTable columns={columns as any} data={data as any} searchInputId="filter-id" />);
    expect(container.querySelector("#filter-id")).toBeTruthy();
  });

  test("renders with rowContextOptions", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const rowContextOptions = [{ label: "Edit", onClick: vi.fn() }];
    const { container } = render(
      <ModernDataTable columns={columns as any} data={data as any} rowContextOptions={rowContextOptions as any} />,
    );
    expect(container.textContent).toContain("Acme");
  });

  test("renders with onRowClick handler", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const { container } = render(<ModernDataTable columns={columns as any} data={data as any} onRowClick={() => {}} />);
    expect(container.textContent).toContain("Acme");
  });

  test("double-click on row invokes onRowClick with row.original data", () => {
    const onRowClick = vi.fn();
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const { container } = render(<ModernDataTable columns={columns as any} data={data as any} onRowClick={onRowClick} />);
    const row = container.querySelector("[data-row-idx='0']") as HTMLElement;
    expect(row).toBeTruthy();
    fireEvent.doubleClick(row);
    expect(onRowClick).toHaveBeenCalledWith({ name: "Acme" });
  });

  test("clicking the fullscreen button calls addDataSnapshot and opens app window on success", async () => {
    addDataSnapshotMock.mockResolvedValueOnce({ id: "snap-123" });
    openAppWindowMock.mockReset();
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const { container } = render(<ModernDataTable columns={columns as any} data={data as any} />);
    const btn = container.querySelector("[aria-label='Make table bigger']") as HTMLElement;
    fireEvent.click(btn);
    await new Promise((r) => setTimeout(r, 30));
    expect(addDataSnapshotMock).toHaveBeenCalled();
    expect(openAppWindowMock).toHaveBeenCalledWith("/data_snapshot/snap-123");
  });

  test("clicking the fullscreen button swallows snapshot rejection silently", async () => {
    addDataSnapshotMock.mockRejectedValueOnce(new Error("fail"));
    openAppWindowMock.mockReset();
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const { container } = render(<ModernDataTable columns={columns as any} data={data as any} />);
    const btn = container.querySelector("[aria-label='Make table bigger']") as HTMLElement;
    fireEvent.click(btn);
    await new Promise((r) => setTimeout(r, 30));
    expect(openAppWindowMock).not.toHaveBeenCalled();
  });

  test("fullScreen prop is accepted without error", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const { container } = render(<ModernDataTable columns={columns as any} data={data as any} {...({ fullScreen: true } as any)} />);
    expect(container.textContent).toContain("Acme");
  });
});
