// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const useGetConnectionsMock = vi.fn();
const useUpdateConnectionsMock = vi.fn();
const useActiveConnectionQueryMock = vi.fn();
const useShowHideMock = vi.fn();

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnections: () => useGetConnectionsMock(),
  useUpdateConnections: () => useUpdateConnectionsMock(),
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
vi.mock("src/frontend/components/ConnectionActions", () => ({
  default: () => <div>ConnActions</div>,
}));
vi.mock("src/frontend/components/ConnectionRetryAlert", () => ({
  default: () => <div>Retry</div>,
}));
vi.mock("src/frontend/components/ConnectionTypeIcon", () => ({ default: () => <i>Icon</i> }));
vi.mock("src/frontend/components/DatabaseDescription", () => ({
  default: () => <div>DbDesc</div>,
}));

import ConnectionDescription from "src/frontend/components/ConnectionDescription";

beforeEach(() => {
  useUpdateConnectionsMock.mockReturnValue({ mutateAsync: vi.fn() });
  useActiveConnectionQueryMock.mockReturnValue({ query: undefined });
  useShowHideMock.mockReturnValue({ visibles: {}, onToggle: vi.fn() });
});

describe("ConnectionDescription", () => {
  test("loading state renders 'Loading Connections...'", () => {
    useGetConnectionsMock.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<ConnectionDescription />);
    expect(container.textContent).toContain("Loading Connections");
  });

  test("empty connections renders 'No connnections'", () => {
    useGetConnectionsMock.mockReturnValue({ data: [], isLoading: false });
    const { container } = render(<ConnectionDescription />);
    expect(container.textContent).toContain("No connnections");
  });

  test("renders DatabaseDescription when connection is online", () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Acme DB", dialect: "mysql", status: "online" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({ visibles: { c1: true }, onToggle: vi.fn() });
    const { container } = render(<ConnectionDescription />);
    expect(container.textContent).toContain("Acme DB");
    expect(container.textContent).toContain("DbDesc");
  });

  test("renders ConnectionRetryAlert when connection is offline", () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Globex DB", dialect: "mysql", status: "offline" }],
      isLoading: false,
    });
    useShowHideMock.mockReturnValue({ visibles: { c1: true }, onToggle: vi.fn() });
    const { container } = render(<ConnectionDescription />);
    expect(container.textContent).toContain("Globex DB");
    expect(container.textContent).toContain("Retry");
  });

  test("active query marks selected connection with 'selected' class", () => {
    useGetConnectionsMock.mockReturnValue({
      data: [{ id: "c1", name: "Init", dialect: "mysql", status: "online" }],
      isLoading: false,
    });
    useActiveConnectionQueryMock.mockReturnValue({ query: { connectionId: "c1" } });
    const { container } = render(<ConnectionDescription />);
    expect(container.innerHTML).toContain("selected");
  });
});
