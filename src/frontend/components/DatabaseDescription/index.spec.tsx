// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const useGetDatabasesMock = vi.fn();
const useActiveConnectionQueryMock = vi.fn();
const useShowHideMock = vi.fn();

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetDatabases: (...args: any[]) => useGetDatabasesMock(...args),
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
vi.mock("src/frontend/components/DatabaseActions", () => ({ default: () => <div>DbActions</div> }));
vi.mock("src/frontend/components/TableDescription", () => ({ default: () => <div>TableDesc</div> }));

import DatabaseDescription from "src/frontend/components/DatabaseDescription";

beforeEach(() => {
  useActiveConnectionQueryMock.mockReturnValue({ query: undefined });
  useShowHideMock.mockReturnValue({ visibles: {}, onToggle: vi.fn() });
});

describe("DatabaseDescription", () => {
  test("loading state", () => {
    useGetDatabasesMock.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { container } = render(<DatabaseDescription connectionId="c1" />);
    expect(container.textContent).toContain("Loading");
  });

  test("error state", () => {
    useGetDatabasesMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { container } = render(<DatabaseDescription connectionId="c1" />);
    expect(container.textContent).toContain("Error");
  });

  test("empty databases renders 'Not Available'", () => {
    useGetDatabasesMock.mockReturnValue({ data: [], isLoading: false, isError: false });
    const { container } = render(<DatabaseDescription connectionId="c1" />);
    expect(container.textContent).toContain("Not Available");
  });

  test("renders databases with table description in expanded state", () => {
    useGetDatabasesMock.mockReturnValue({
      data: [{ name: "acme_db" }, { name: "globex_db" }],
      isLoading: false,
      isError: false,
    });
    useShowHideMock.mockReturnValue({ visibles: { "c1 > acme_db": true }, onToggle: vi.fn() });
    const { container } = render(<DatabaseDescription connectionId="c1" />);
    expect(container.textContent).toContain("acme_db");
    expect(container.textContent).toContain("globex_db");
    expect(container.textContent).toContain("TableDesc");
  });

  test("active query selects the database", () => {
    useGetDatabasesMock.mockReturnValue({
      data: [{ name: "acme_db" }],
      isLoading: false,
      isError: false,
    });
    useActiveConnectionQueryMock.mockReturnValue({ query: { connectionId: "c1", databaseId: "acme_db" } });
    const { container } = render(<DatabaseDescription connectionId="c1" />);
    expect(container.innerHTML).toContain("selected");
  });
});
