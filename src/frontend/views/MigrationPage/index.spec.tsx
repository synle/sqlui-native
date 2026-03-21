// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("src/frontend/components/Breadcrumbs", () => ({ default: () => <div>Breadcrumbs</div> }));
vi.mock("src/frontend/components/VirtualizedConnectionTree", () => ({ default: () => <div>Tree</div> }));
vi.mock("src/frontend/components/NewConnectionButton", () => ({ default: () => <div>NewConn</div> }));
vi.mock("src/frontend/components/MigrationForm", () => ({
  RawJsonMigrationForm: () => <div>RawJsonForm</div>,
  RealConnectionMigrationMigrationForm: () => <div>RealConnForm</div>,
}));
vi.mock("src/frontend/layout/LayoutTwoColumns", () => ({
  default: (props: any) => <div>{props.children}</div>,
}));
vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({ data: { showContextMenu: true }, setTreeActions: vi.fn() }),
}));

import MigrationPage from "src/frontend/views/MigrationPage";

describe("MigrationPage", () => {
  test("renders migration option links when no mode", () => {
    const { container } = render(
      <MemoryRouter>
        <MigrationPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("migration option");
  });

  test("renders RealConnForm when mode is real_connection", () => {
    const { container } = render(
      <MemoryRouter>
        <MigrationPage mode="real_connection" />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("RealConnForm");
  });

  test("renders RawJsonForm when mode is raw_json", () => {
    const { container } = render(
      <MemoryRouter>
        <MigrationPage mode="raw_json" />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("RawJsonForm");
  });
});
