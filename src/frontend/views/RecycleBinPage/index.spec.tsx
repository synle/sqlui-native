// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router";

vi.mock("src/frontend/components/Breadcrumbs", () => ({ default: () => <div>Breadcrumbs</div> }));
vi.mock("src/frontend/components/VirtualizedConnectionTree", () => ({ default: () => <div>Tree</div> }));
vi.mock("src/frontend/components/NewConnectionButton", () => ({ default: () => <div>NewConn</div> }));
vi.mock("src/frontend/components/DataTable", () => ({ default: () => <div>DataTable</div> }));
vi.mock("src/frontend/layout/LayoutTwoColumns", () => ({
  default: (props: any) => <div>{props.children}</div>,
}));
vi.mock("src/frontend/hooks/useClientSidePreference", () => ({
  useSideBarWidthPreference: () => ({ value: 300, onChange: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({ data: { showContextMenu: true }, setTreeActions: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ confirm: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useFolderItems", () => ({
  useGetRecycleBinItems: () => ({ data: [], isLoading: false }),
  useDeletedRecycleBinItem: () => ({ mutateAsync: vi.fn() }),
  useRestoreRecycleBinItem: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: vi.fn() }),
}));

import RecycleBinPage from "src/frontend/views/RecycleBinPage";

describe("RecycleBinPage", () => {
  test("renders Breadcrumbs", () => {
    const { container } = render(
      <MemoryRouter>
        <RecycleBinPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Breadcrumbs");
  });

  test("renders empty recycle bin text", () => {
    const { container } = render(
      <MemoryRouter>
        <RecycleBinPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("empty");
  });

  test("renders Tree and NewConn", () => {
    const { container } = render(
      <MemoryRouter>
        <RecycleBinPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Tree");
    expect(container.textContent).toContain("NewConn");
  });
});
