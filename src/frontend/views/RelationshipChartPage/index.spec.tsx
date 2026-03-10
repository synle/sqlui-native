// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("src/frontend/components/Breadcrumbs", () => ({
  default: (props: any) => <div>Breadcrumbs</div>,
  BreadcrumbLink: {},
}));
vi.mock("src/frontend/data/file", () => ({
  downloadBlob: vi.fn(),
}));
vi.mock("html-to-image", () => ({
  toPng: vi.fn(),
}));
vi.mock("@xyflow/react", () => ({
  ReactFlow: () => <div>ReactFlow</div>,
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
  Background: () => null,
  Panel: ({ children }: any) => <div>{children}</div>,
  useNodesState: (init: any) => [init, vi.fn(), vi.fn()],
  useEdgesState: (init: any) => [init, vi.fn(), vi.fn()],
  useReactFlow: () => ({ fitView: vi.fn() }),
}));
vi.mock("@xyflow/react/dist/style.css", () => ({}));
vi.mock("src/frontend/App.scss", () => ({}));
vi.mock("src/frontend/electronRenderer", () => ({}));
vi.mock("src/frontend/utils/commonUtils", () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnectionById: () => ({
    data: {
      id: "c1",
      name: "TestConn",
      dialect: "mysql",
      connection: "mysql://localhost",
    },
    refetch: vi.fn(),
    error: null,
    isLoading: false,
  }),
  useGetDatabases: () => ({
    data: [{ name: "db1" }],
    refetch: vi.fn(),
    error: null,
    isLoading: false,
  }),
  useGetAllTableColumns: () => ({
    data: null,
    refetch: vi.fn(),
    error: null,
    isLoading: false,
  }),
  useGetColumns: () => ({
    data: [],
    refetch: vi.fn(),
    error: null,
    isLoading: false,
  }),
}));

import RelationshipChartPage from "src/frontend/views/RelationshipChartPage";

describe("RelationshipChartPage", () => {
  test("renders Breadcrumbs", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/visualization/c1"]}>
        <Routes>
          <Route path="/visualization/:connectionId" element={<RelationshipChartPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Breadcrumbs");
  });

  test("renders database selection when no databaseId", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/visualization/c1"]}>
        <Routes>
          <Route path="/visualization/:connectionId" element={<RelationshipChartPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Select one of the following database");
  });
});
