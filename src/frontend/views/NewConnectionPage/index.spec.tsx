// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router";

vi.mock("src/frontend/components/Breadcrumbs", () => ({ default: () => <div>Breadcrumbs</div> }));
vi.mock("src/frontend/components/VirtualizedConnectionTree", () => ({ default: () => <div>Tree</div> }));
vi.mock("src/frontend/components/ConnectionForm", () => ({
  NewConnectionForm: () => <div>NewConnectionForm</div>,
}));
vi.mock("src/frontend/components/NewConnectionButton", () => ({ default: () => <div>NewConn</div> }));
vi.mock("src/frontend/layout/LayoutTwoColumns", () => ({
  default: (props: any) => <div>{props.children}</div>,
}));
vi.mock("src/frontend/hooks/useClientSidePreference", () => ({
  useSideBarWidthPreference: () => ({ value: 300, onChange: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({ data: { showContextMenu: true }, setTreeActions: vi.fn() }),
}));

import NewConnectionPage from "src/frontend/views/NewConnectionPage";

describe("NewConnectionPage", () => {
  test("renders Breadcrumbs", () => {
    const { container } = render(
      <MemoryRouter>
        <NewConnectionPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Breadcrumbs");
  });

  test("renders NewConnectionForm", () => {
    const { container } = render(
      <MemoryRouter>
        <NewConnectionPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("NewConnectionForm");
  });
});
