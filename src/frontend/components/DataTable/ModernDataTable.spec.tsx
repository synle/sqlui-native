// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

vi.mock("src/frontend/hooks/useSetting", () => ({
  useLayoutModeSetting: () => "compact",
}));

vi.mock("src/frontend/hooks/useDataSnapshot", () => ({
  useAddDataSnapshot: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("src/frontend/platform", () => ({
  platform: { openAppWindow: vi.fn(), isDesktop: false },
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

  test("renders with searchInputId", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const { container } = render(<ModernDataTable columns={columns as any} data={data as any} searchInputId="search-1" />);
    expect(container.textContent).toContain("Acme");
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
});
