// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("src/frontend/components/Breadcrumbs", () => ({ default: () => <div>Breadcrumbs</div> }));
vi.mock("src/frontend/components/VirtualizedConnectionTree", () => ({ default: () => <div>Tree</div> }));
vi.mock("src/frontend/components/NewConnectionButton", () => ({ default: () => <div>NewConn</div> }));
vi.mock("src/frontend/components/QueryBoxTabs", () => ({ default: () => <div>QueryBoxTabs</div> }));
vi.mock("src/frontend/layout/LayoutTwoColumns", () => ({
  default: (props: any) => <div>{props.children}</div>,
}));
vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({ data: { showContextMenu: true }, setTreeActions: vi.fn() }),
}));

import MainPage from "src/frontend/views/MainPage";

describe("MainPage", () => {
  test("renders Breadcrumbs", () => {
    const { container } = render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Breadcrumbs");
  });

  test("renders QueryBoxTabs", () => {
    const { container } = render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("QueryBoxTabs");
  });
});
