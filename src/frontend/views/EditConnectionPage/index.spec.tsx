// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("src/frontend/components/Breadcrumbs", () => ({ default: () => <div>Breadcrumbs</div> }));
vi.mock("src/frontend/components/VirtualizedConnectionTree", () => ({ default: () => <div>Tree</div> }));
vi.mock("src/frontend/components/ConnectionForm", () => ({
  EditConnectionForm: (props: any) => <div>EditForm-{props.id}</div>,
}));
vi.mock("src/frontend/components/NewConnectionButton", () => ({ default: () => <div>NewConn</div> }));
vi.mock("src/frontend/layout/LayoutTwoColumns", () => ({
  default: (props: any) => <div>{props.children}</div>,
}));
vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({ data: { showContextMenu: true }, setTreeActions: vi.fn() }),
}));

import EditConnectionPage from "src/frontend/views/EditConnectionPage";

describe("EditConnectionPage", () => {
  test("renders EditForm with connectionId from params", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/connection/edit/c1"]}>
        <Routes>
          <Route path="/connection/edit/:connectionId" element={<EditConnectionPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("EditForm-c1");
  });
});
