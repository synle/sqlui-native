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
  getDatabaseActions: () => [],
  isDialectSupportManagedMetadata: () => false,
  isDialectSupportVisualization: () => false,
}));

vi.mock("src/frontend/data/api", () => ({
  ProxyApi: {},
}));

vi.mock("src/frontend/hooks/useManagedMetadata", () => ({
  useCreateManagedTable: () => ({ mutateAsync: vi.fn() }),
  useUpdateManagedTable: () => ({ mutateAsync: vi.fn() }),
  useUpdateManagedDatabase: () => ({ mutateAsync: vi.fn() }),
  useDeleteManagedDatabase: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ prompt: vi.fn(), confirm: vi.fn() }),
}));

vi.mock("src/frontend/components/DropdownButton", () => ({
  default: (props: any) => <div data-testid="dropdown">{props.children}</div>,
}));

vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnectionById: () => ({ data: { dialect: "mysql" }, isLoading: false }),
  useRefreshDatabase: () => vi.fn(),
}));

vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useActiveConnectionQuery: () => ({}),
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

import DatabaseActions from "src/frontend/components/DatabaseActions";

describe("DatabaseActions", () => {
  beforeEach(() => {
    mockShowContextMenu = true;
  });

  test("renders dropdown when showContextMenu is true", () => {
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.querySelector("[data-testid='dropdown']")).toBeTruthy();
  });

  test("returns null when showContextMenu is false", () => {
    mockShowContextMenu = false;
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.innerHTML).toMatchInlineSnapshot(`""`);
  });
});
