// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("src/frontend/components/Breadcrumbs", () => ({ default: () => <div>Breadcrumbs</div> }));
vi.mock("src/frontend/components/VirtualizedConnectionTree", () => ({ default: () => <div>Tree</div> }));
vi.mock("src/frontend/components/NewConnectionButton", () => ({ default: () => <div>NewConn</div> }));
vi.mock("src/frontend/components/CodeEditorBox", () => ({ default: () => <div>CodeEditorBox</div> }));
vi.mock("src/frontend/components/JsonFormatData", () => ({ default: () => <div>JsonFormatData</div> }));
vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: vi.fn() }),
}));
vi.mock("src/frontend/components/QueryBox/ConnectionDatabaseSelector", () => ({
  default: () => <div>ConnectionDatabaseSelector</div>,
}));
vi.mock("src/frontend/components/Tabs", () => ({
  default: (_props: any) => <div>Tabs</div>,
}));
vi.mock("src/frontend/layout/LayoutTwoColumns", () => ({
  default: (props: any) => <div>{props.children}</div>,
}));
vi.mock("src/frontend/hooks/useClientSidePreference", () => ({
  useSideBarWidthPreference: () => ({ value: 300, onChange: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({ data: { showContextMenu: false }, setTreeActions: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnectionById: () => ({ data: null }),
  useGetColumns: () => ({ data: [] }),
}));
vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useActiveConnectionQuery: () => ({ query: null }),
  useConnectionQueries: () => ({ onAddQuery: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ alert: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: vi.fn() }),
}));
vi.mock("src/frontend/utils/formatter", () => ({
  formatSQL: (s: string) => s,
  formatJS: (s: string) => s,
}));
vi.mock("src/frontend/utils/commonUtils", () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock("src/common/adapters/DataScriptFactory", () => ({
  isDialectSupportCreateRecordForm: () => false,
  isDialectSupportEditRecordForm: () => false,
}));
vi.mock("src/common/adapters/AzureCosmosDataAdapter/scripts", () => ({
  getInsert: vi.fn(),
  getUpdateWithValues: vi.fn(),
}));
vi.mock("src/common/adapters/AzureTableStorageAdapter/scripts", () => ({
  AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE: [],
  getInsert: vi.fn(),
  getUpdateWithValues: vi.fn(),
}));
vi.mock("src/common/adapters/CassandraDataAdapter/scripts", () => ({
  getInsert: vi.fn(),
  getUpdateWithValues: vi.fn(),
}));
vi.mock("src/common/adapters/MongoDBDataAdapter/scripts", () => ({
  getInsert: vi.fn(),
  getUpdateWithValues: vi.fn(),
}));
vi.mock("src/common/adapters/RelationalDataAdapter/scripts", () => ({
  getInsert: vi.fn(),
  getUpdateWithValues: vi.fn(),
}));

import { NewRecordPage } from "src/frontend/views/RecordPage";

describe("RecordPage", () => {
  test("renders Breadcrumbs", () => {
    const { container } = render(
      <MemoryRouter>
        <NewRecordPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Breadcrumbs");
  });

  test("renders NewConn button", () => {
    const { container } = render(
      <MemoryRouter>
        <NewRecordPage />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("NewConn");
  });
});
