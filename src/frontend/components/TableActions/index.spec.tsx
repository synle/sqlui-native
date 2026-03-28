// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/frontend/utils/commonUtils", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("src/common/adapters/BaseDataAdapter/scripts", () => ({
  getDivider: () => ({ divider: true }),
}));

vi.mock("src/common/adapters/DataScriptFactory", () => ({
  getTableActions: () => [],
  isDialectSupportManagedMetadata: () => false,
  isDialectSupportVisualization: () => false,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("src/frontend/data/api", () => ({
  ProxyApi: {},
}));

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ confirm: vi.fn(), prompt: vi.fn() }),
}));

vi.mock("src/frontend/components/DropdownButton", () => ({
  default: (props: any) => <div data-testid="dropdown">{props.children}</div>,
}));

vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnectionById: () => ({ data: { dialect: "mysql" }, isLoading: false }),
  useGetColumns: () => ({ data: [], isLoading: false }),
  useRefreshTable: () => vi.fn(),
}));

vi.mock("src/frontend/hooks/useSetting", () => ({
  useQuerySizeSetting: () => 200,
}));

let mockShowContextMenu = true;

vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({
    data: {
      get showContextMenu() {
        return mockShowContextMenu;
      },
    },
    setTreeActions: vi.fn(),
  }),
}));

import TableActions from "src/frontend/components/TableActions";

describe("TableActions", () => {
  beforeEach(() => {
    mockShowContextMenu = true;
  });

  test("renders dropdown when showContextMenu is true", () => {
    const { container } = render(<TableActions connectionId="c1" databaseId="db1" tableId="t1" />);
    expect(container.querySelector("[data-testid='dropdown']")).toBeTruthy();
  });

  test("returns null when showContextMenu is false", () => {
    mockShowContextMenu = false;
    const { container } = render(<TableActions connectionId="c1" databaseId="db1" tableId="t1" />);
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });
});
