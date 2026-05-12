/** @vitest-environment jsdom */
import { describe, test, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("src/frontend/hooks/useSetting", () => ({
  useTableRenderer: () => "advanced",
  useLayoutModeSetting: () => "compact",
}));

vi.mock("src/frontend/components/DataTable/ModernDataTable", () => ({
  default: ({ columns, data }: any) => (
    <div data-testid="modern-table">
      <span data-testid="col-count">{columns.length}</span>
      <span data-testid="row-count">{data.length}</span>
    </div>
  ),
}));

vi.mock("src/frontend/components/DataTable/LegacyDataTable", () => ({
  default: ({ columns, data }: any) => (
    <div data-testid="legacy-table">
      <span data-testid="col-count">{columns.length}</span>
      <span data-testid="row-count">{data.length}</span>
    </div>
  ),
}));

import { DataTableWithJSONList, ALL_PAGE_SIZE_OPTIONS, DEFAULT_TABLE_PAGE_SIZE } from "src/frontend/components/DataTable";

describe("DataTableWithJSONList", () => {
  test("auto-generates columns from row keys + row-number col, renders Modern", () => {
    const data = [
      { id: 1, name: "Acme" },
      { id: 2, name: "Globex" },
    ];
    const { getByTestId } = render(<DataTableWithJSONList data={data as any} />);
    expect(getByTestId("modern-table")).toBeTruthy();
    expect(getByTestId("col-count").textContent).toBe("3"); // # + id + name
    expect(getByTestId("row-count").textContent).toBe("2");
  });

  test("non-object rows are wrapped as <unnamed_property>", () => {
    const { getByTestId } = render(<DataTableWithJSONList data={["raw", 42, true] as any} />);
    expect(getByTestId("col-count").textContent).toBe("2"); // # + <unnamed_property>
  });

  test("ALL_PAGE_SIZE_OPTIONS contains common page sizes", () => {
    const values = ALL_PAGE_SIZE_OPTIONS.map((o) => o.value);
    expect(values).toEqual([10, 25, 50, 100, -1]);
  });

  test("DEFAULT_TABLE_PAGE_SIZE = 50", () => {
    expect(DEFAULT_TABLE_PAGE_SIZE).toBe(50);
  });

  test("empty data still renders", () => {
    const { getByTestId } = render(<DataTableWithJSONList data={[]} />);
    expect(getByTestId("row-count").textContent).toBe("0");
  });
});

// Switch renderer via mock override using a second describe + isolateModules
describe("DataTableWithJSONList — legacy renderer", () => {
  test("renders LegacyDataTable when tableRenderer != 'advanced'", async () => {
    vi.resetModules();
    vi.doMock("src/frontend/hooks/useSetting", () => ({
      useTableRenderer: () => "legacy",
      useLayoutModeSetting: () => "compact",
    }));
    vi.doMock("src/frontend/components/DataTable/ModernDataTable", () => ({
      default: () => <div data-testid="modern-table-2" />,
    }));
    vi.doMock("src/frontend/components/DataTable/LegacyDataTable", () => ({
      default: ({ data }: any) => <div data-testid="legacy-table-2">{data.length}</div>,
    }));
    const { DataTableWithJSONList: Mod } = await import("src/frontend/components/DataTable");
    const { getByTestId } = render(<Mod data={[{ a: 1 }]} />);
    expect(getByTestId("legacy-table-2")).toBeTruthy();
  });
});
