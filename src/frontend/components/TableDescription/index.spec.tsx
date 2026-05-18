// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const useGetTablesMock = vi.fn();
const useShowHideMock = vi.fn();

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetTables: (...args: any[]) => useGetTablesMock(...args),
}));
vi.mock("src/frontend/hooks/useShowHide", () => ({
  useShowHide: () => useShowHideMock(),
}));
vi.mock("src/frontend/components/Accordion", () => ({
  AccordionHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  AccordionBody: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("src/frontend/components/ColumnDescription", () => ({ default: () => <div>ColumnDesc</div> }));
vi.mock("src/frontend/components/TableActions", () => ({ default: () => <div>TableActions</div> }));

import TableDescription from "src/frontend/components/TableDescription";

beforeEach(() => {
  useShowHideMock.mockReturnValue({ visibles: {}, onToggle: vi.fn() });
});

describe("TableDescription", () => {
  test("loading state", () => {
    useGetTablesMock.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<TableDescription connectionId="c1" databaseId="db1" />);
    expect(container.textContent).toContain("Loading");
  });

  test("empty tables renders 'Not Available'", () => {
    useGetTablesMock.mockReturnValue({ data: [], isLoading: false });
    const { container } = render(<TableDescription connectionId="c1" databaseId="db1" />);
    expect(container.textContent).toContain("Not Available");
  });

  test("renders table names + ColumnDesc when expanded", () => {
    useGetTablesMock.mockReturnValue({
      data: [{ name: "users" }, { name: "orders" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({
      visibles: { "c1 > db1 > users": true },
      onToggle: vi.fn(),
    });
    const { container } = render(<TableDescription connectionId="c1" databaseId="db1" />);
    expect(container.textContent).toContain("users");
    expect(container.textContent).toContain("orders");
    expect(container.textContent).toContain("ColumnDesc");
    expect(container.innerHTML).toContain("selected");
  });
});
