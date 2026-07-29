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

import LegacyDataTable from "src/frontend/components/DataTable/LegacyDataTable";

describe("LegacyDataTable", () => {
  test("renders basic columns and rows", () => {
    const columns = [
      { header: "Name", accessorKey: "name" },
      { header: "Age", accessorKey: "age" },
    ];
    const data = [
      { name: "Acme", age: 100 },
      { name: "Globex", age: 50 },
    ];
    const { container } = render(<LegacyDataTable columns={columns as any} data={data as any} />);
    expect(container.textContent).toContain("Name");
    expect(container.textContent).toContain("Age");
    expect(container.textContent).toContain("Acme");
    expect(container.textContent).toContain("Globex");
  });

  test("renders empty data", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const { container } = render(<LegacyDataTable columns={columns as any} data={[] as any} />);
    expect(container.textContent).toContain("Name");
  });

  test("renders with searchInputId showing GlobalFilter", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const { container } = render(
      <LegacyDataTable columns={columns as any} data={data as any} searchInputId="search-1" />,
    );
    expect(container.textContent).toContain("Acme");
  });

  test("renders with onRowClick (sets cursor)", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const onRowClick = vi.fn();
    const { container } = render(
      <LegacyDataTable columns={columns as any} data={data as any} onRowClick={onRowClick} />,
    );
    expect(container.textContent).toContain("Acme");
  });

  test("renders with rowContextOptions", () => {
    const columns = [{ header: "Name", accessorKey: "name" }];
    const data = [{ name: "Acme" }];
    const rowContextOptions = [{ label: "Edit", onClick: vi.fn() }];
    const { container } = render(
      <LegacyDataTable
        columns={columns as any}
        data={data as any}
        rowContextOptions={rowContextOptions as any}
      />,
    );
    expect(container.textContent).toContain("Acme");
  });
});
