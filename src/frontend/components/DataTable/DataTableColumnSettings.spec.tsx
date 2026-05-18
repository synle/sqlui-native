// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

const modalMock = vi.fn().mockResolvedValue(undefined);
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ modal: modalMock }),
}));

import DataTableColumnSettings from "src/frontend/components/DataTable/DataTableColumnSettings";

const makeTable = () => {
  const state: any = { columnOrder: ["a", "b"], columnVisibility: {} };
  const columns = [
    { id: "a", columnDef: { header: "Col A" } },
    { id: "b", columnDef: { header: "" } },
  ];
  return {
    getAllColumns: () => columns,
    getState: () => state,
    setColumnVisibility: vi.fn(),
    setColumnOrder: vi.fn(),
  } as any;
};

describe("DataTableColumnSettings", () => {
  test("renders the settings button", () => {
    const { container } = render(<DataTableColumnSettings table={makeTable()} />);
    expect(container.querySelector('[aria-label="Column settings"]')).toBeTruthy();
  });

  test("clicking opens a modal with column settings", async () => {
    modalMock.mockClear();
    const { container } = render(<DataTableColumnSettings table={makeTable()} />);
    const btn = container.querySelector('[aria-label="Column settings"]')!;
    fireEvent.click(btn);
    expect(modalMock).toHaveBeenCalled();
    const callArg = modalMock.mock.calls[0][0];
    expect(callArg.title).toBe("Column Settings");
    expect(callArg.showCloseButton).toBe(true);
    expect(callArg.size).toBe("sm");
  });

  test("modal content (rendered standalone) shows column headers and controls", async () => {
    modalMock.mockClear();
    const table = makeTable();
    const { container } = render(<DataTableColumnSettings table={table} />);
    fireEvent.click(container.querySelector('[aria-label="Column settings"]')!);
    const message = modalMock.mock.calls[0][0].message;
    const { container: c2, getByText } = render(message);
    expect(c2.textContent).toContain("Col A");
    expect(c2.textContent).toContain("b"); // fallback to id when header empty
    expect(getByText("Select All")).toBeTruthy();
    expect(getByText("Clear All")).toBeTruthy();
    expect(getByText("Pin Visible")).toBeTruthy();
    expect(getByText("Reset")).toBeTruthy();
  });

  test("Select All / Clear All / Reset call setColumnVisibility on the table", () => {
    modalMock.mockClear();
    const table = makeTable();
    const { container } = render(<DataTableColumnSettings table={table} />);
    fireEvent.click(container.querySelector('[aria-label="Column settings"]')!);
    const message = modalMock.mock.calls[0][0].message;
    const { getByText } = render(message);
    fireEvent.click(getByText("Select All"));
    expect(table.setColumnVisibility).toHaveBeenCalledWith({ a: true, b: true });
    fireEvent.click(getByText("Clear All"));
    expect(table.setColumnVisibility).toHaveBeenCalledWith({ a: false, b: false });
    fireEvent.click(getByText("Reset"));
    expect(table.setColumnOrder).toHaveBeenCalledWith(["a", "b"]);
  });

  test("toggling a column checkbox updates visibility", () => {
    modalMock.mockClear();
    const table = makeTable();
    const { container } = render(<DataTableColumnSettings table={table} />);
    fireEvent.click(container.querySelector('[aria-label="Column settings"]')!);
    const message = modalMock.mock.calls[0][0].message;
    const { container: c2 } = render(message);
    const checkboxInputs = c2.querySelectorAll('input[type="checkbox"]');
    expect(checkboxInputs.length).toBe(2);
    fireEvent.click(checkboxInputs[0]);
    expect(table.setColumnVisibility).toHaveBeenCalled();
  });
});
