// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const useGetColumnsMock = vi.fn();
const useActiveConnectionQueryMock = vi.fn();
const useShowHideMock = vi.fn();

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetColumns: (...args: any[]) => useGetColumnsMock(...args),
}));
vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useActiveConnectionQuery: () => useActiveConnectionQueryMock(),
}));
vi.mock("src/frontend/hooks/useShowHide", () => ({
  useShowHide: () => useShowHideMock(),
}));
vi.mock("src/frontend/components/Accordion", () => ({
  AccordionHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  AccordionBody: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("src/frontend/components/ColumnDescription/ColumnAttributes", () => ({
  default: () => <div>ColAttrs</div>,
}));
vi.mock("src/frontend/components/ColumnDescription/ColumnName", () => ({
  default: ({ value }: { value: string }) => <span>{value}</span>,
}));
vi.mock("src/frontend/components/ColumnDescription/ColumnType", () => ({
  default: ({ value }: { value: string }) => <span>{value}</span>,
}));

import ColumnDescription from "src/frontend/components/ColumnDescription";

beforeEach(() => {
  useActiveConnectionQueryMock.mockReturnValue({ query: undefined });
  useShowHideMock.mockReturnValue({ visibles: {}, onToggle: vi.fn() });
});

describe("ColumnDescription", () => {
  test("loading state", () => {
    useGetColumnsMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { container } = render(
      <ColumnDescription connectionId="c1" databaseId="db1" tableId="t1" />,
    );
    expect(container.textContent).toContain("Loading");
  });

  test("error state", () => {
    useGetColumnsMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { container } = render(
      <ColumnDescription connectionId="c1" databaseId="db1" tableId="t1" />,
    );
    expect(container.textContent).toContain("Error");
  });

  test("empty columns renders 'Not Available'", () => {
    useGetColumnsMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    const { container } = render(
      <ColumnDescription connectionId="c1" databaseId="db1" tableId="t1" />,
    );
    expect(container.textContent).toContain("Not Available");
  });

  test("renders all columns with key icons and types", () => {
    useGetColumnsMock.mockReturnValue({
      data: [
        { name: "id", type: "INT", primaryKey: true },
        {
          name: "user_id",
          type: "INT",
          kind: "foreign_key",
          referencedTableName: "users",
          referencedColumnName: "id",
        },
        { name: "name", type: "VARCHAR" },
        { name: "partition", type: "TEXT", kind: "partition_key" },
        { name: "cluster", type: "TEXT", kind: "clustering" },
      ],
      isLoading: false,
      isError: false,
    });
    const { container } = render(
      <ColumnDescription connectionId="c1" databaseId="db1" tableId="t1" />,
    );
    expect(container.textContent).toContain("id");
    expect(container.textContent).toContain("user_id");
    expect(container.textContent).toContain("VARCHAR");
  });

  test("shows 'Show All Columns' button when too many columns", () => {
    // 41 columns triggers the button (MAX = 40)
    const cols = Array.from({ length: 50 }, (_, i) => ({ name: `c${i}`, type: "TEXT" }));
    useGetColumnsMock.mockReturnValue({ data: cols, isLoading: false, isError: false });
    useShowHideMock.mockReturnValue({ visibles: {}, onToggle: vi.fn() });
    const { container } = render(
      <ColumnDescription connectionId="c1" databaseId="db1" tableId="t1" />,
    );
    const btn = container.querySelector(".ShowAllColumnsButton button");
    expect(btn).toBeTruthy();
    if (btn) {
      fireEvent.click(btn);
    }
  });
});
