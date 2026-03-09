// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("src/frontend/components/BookmarksItemList", () => ({ default: () => <div>BookmarksList</div> }));
vi.mock("src/frontend/components/Breadcrumbs", () => ({ default: (props: any) => <div>Breadcrumbs</div> }));
vi.mock("src/frontend/components/VirtualizedConnectionTree", () => ({ default: () => <div>Tree</div> }));
vi.mock("src/frontend/components/NewConnectionButton", () => ({ default: () => <div>NewConn</div> }));
vi.mock("src/frontend/layout/LayoutTwoColumns", () => ({
  default: (props: any) => <div className="LayoutTwoColumns">{props.children}</div>,
}));
vi.mock("src/frontend/hooks/useClientSidePreference", () => ({
  useSideBarWidthPreference: () => ({ value: 300, onChange: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({ data: { showContextMenu: false }, setTreeActions: vi.fn() }),
}));

import BookmarksPage from "src/frontend/views/BookmarksPage";

describe("BookmarksPage", () => {
  test("renders Breadcrumbs", () => {
    const { container } = render(
      <MemoryRouter>
        <BookmarksPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Breadcrumbs");
  });

  test("renders BookmarksList", () => {
    const { container } = render(
      <MemoryRouter>
        <BookmarksPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("BookmarksList");
  });
});
