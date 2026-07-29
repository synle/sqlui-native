// @vitest-environment jsdom
import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const mockNavigate = vi.fn();
const mockCreateManagedTable = vi.fn();
const mockUpdateManagedTable = vi.fn();
const mockUpdateManagedDatabase = vi.fn();
const mockDeleteManagedDatabase = vi.fn();
const mockSelectCommand = vi.fn();
const mockRefreshDatabase = vi.fn();
const mockOnTreeToggle = vi.fn();
const mockConfirm = vi.fn();
const mockModal = vi.fn();
const mockDismiss = vi.fn();
const mockGetManagedDatabase = vi.fn();

let mockDialect = "mysql";
let mockManagedMetadata = false;
let mockSupportsVisualization = false;
let mockDatabaseActions: any[] = [];
let mockTableActions: any[] = [];

vi.mock("src/frontend/utils/commonUtils", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("src/common/adapters/BaseDataAdapter/scripts", () => ({
  getDivider: () => ({ divider: true }),
}));

vi.mock("src/common/adapters/DataScriptFactory", () => ({
  getDatabaseActions: () => mockDatabaseActions,
  getTableActions: () => mockTableActions,
  isDialectSupportManagedMetadata: () => mockManagedMetadata,
  isDialectSupportVisualization: () => mockSupportsVisualization,
}));

vi.mock("src/frontend/data/api", () => ({
  ProxyApi: {
    getManagedDatabase: (...args: any[]) => mockGetManagedDatabase(...args),
  },
}));

vi.mock("src/frontend/hooks/useManagedMetadata", () => ({
  useCreateManagedTable: () => ({ mutateAsync: mockCreateManagedTable }),
  useUpdateManagedTable: () => ({ mutateAsync: mockUpdateManagedTable }),
  useUpdateManagedDatabase: () => ({ mutateAsync: mockUpdateManagedDatabase }),
  useDeleteManagedDatabase: () => ({ mutateAsync: mockDeleteManagedDatabase }),
}));

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({
    prompt: vi.fn(),
    confirm: mockConfirm,
    modal: mockModal,
    dismiss: mockDismiss,
  }),
}));

vi.mock("src/frontend/components/DropdownButton", () => ({
  default: (props: any) => (
    <div data-testid="dropdown">
      {props.options?.map((opt: any, idx: number) => (
        <button key={idx} data-testid={`opt-${opt.label}`} onClick={opt.onClick}>
          {opt.label}
        </button>
      ))}
      {props.children}
    </div>
  ),
}));

vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: mockSelectCommand }),
}));

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnectionById: () => ({ data: { dialect: mockDialect }, isLoading: false }),
  useRefreshDatabase: () => mockRefreshDatabase,
}));

vi.mock("src/frontend/hooks/useConnectionQuery", () => ({
  useActiveConnectionQuery: () => ({}),
}));

vi.mock("src/frontend/hooks/useShowHide", () => ({
  useShowHide: () => ({ onToggle: mockOnTreeToggle }),
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

vi.mock("src/frontend/components/DatabaseActions/EditFolderModal", () => ({
  default: () => <div data-testid="edit-folder-modal" />,
}));

import DatabaseActions from "src/frontend/components/DatabaseActions";

describe("DatabaseActions", () => {
  beforeEach(() => {
    mockShowContextMenu = true;
    mockDialect = "mysql";
    mockManagedMetadata = false;
    mockSupportsVisualization = false;
    mockDatabaseActions = [];
    mockTableActions = [];
    mockNavigate.mockReset();
    mockCreateManagedTable.mockReset();
    mockUpdateManagedTable.mockReset();
    mockUpdateManagedDatabase.mockReset();
    mockDeleteManagedDatabase.mockReset();
    mockSelectCommand.mockReset();
    mockRefreshDatabase.mockReset();
    mockOnTreeToggle.mockReset();
    mockConfirm.mockReset();
    mockModal.mockReset();
    mockDismiss.mockReset();
    mockGetManagedDatabase.mockReset();
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

  test("renders Select option for non-managed dialects", () => {
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.querySelector("[data-testid='opt-Select']")).toBeTruthy();
  });

  test("omits Select option for managed-metadata dialects", () => {
    mockManagedMetadata = true;
    mockDialect = "rest";
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.querySelector("[data-testid='opt-Select']")).toBeFalsy();
  });

  test("includes Visualize option for dialects that support visualization", () => {
    mockSupportsVisualization = true;
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.querySelector("[data-testid='opt-Visualize']")).toBeTruthy();
  });

  test("clicking Visualize navigates to visualization route", () => {
    mockSupportsVisualization = true;
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    fireEvent.click(container.querySelector("[data-testid='opt-Visualize']") as HTMLElement);
    expect(mockNavigate).toHaveBeenCalled();
    expect(mockNavigate.mock.calls[0][0]).toMatch(/^\/visualization\//);
  });

  test("includes Refresh option for non-rest/non-graphql dialects", () => {
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.querySelector("[data-testid='opt-Refresh']")).toBeTruthy();
  });

  test("omits Refresh option for rest dialect", () => {
    mockDialect = "rest";
    mockManagedMetadata = true;
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.querySelector("[data-testid='opt-Refresh']")).toBeFalsy();
  });

  test("omits Refresh option for graphql dialect", () => {
    mockDialect = "graphql";
    mockManagedMetadata = true;
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.querySelector("[data-testid='opt-Refresh']")).toBeFalsy();
  });

  test("clicking Refresh invokes refreshDatabase with connection and db ids", () => {
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    fireEvent.click(container.querySelector("[data-testid='opt-Refresh']") as HTMLElement);
    expect(mockRefreshDatabase).toHaveBeenCalledWith("c1", "db1");
  });

  test("managed metadata adds 'New Blank Request' option", () => {
    mockManagedMetadata = true;
    mockDialect = "rest";
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.querySelector("[data-testid='opt-New Blank Request']")).toBeTruthy();
  });

  test("clicking 'New Blank Request' calls createManagedTable and selectCommand", async () => {
    mockManagedMetadata = true;
    mockDialect = "rest";
    mockCreateManagedTable.mockResolvedValue({ id: "t-new", name: "New Request" });
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    fireEvent.click(
      container.querySelector("[data-testid='opt-New Blank Request']") as HTMLElement,
    );
    await waitFor(() => expect(mockCreateManagedTable).toHaveBeenCalled());
    await waitFor(() => expect(mockSelectCommand).toHaveBeenCalled());
    const cmdCall = mockSelectCommand.mock.calls[0][0];
    expect(cmdCall.event).toBe("clientEvent/query/apply");
    expect(cmdCall.data.tableId).toBe("t-new");
  });

  test("managed metadata adds 'Edit Folder' option", () => {
    mockManagedMetadata = true;
    mockDialect = "rest";
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.querySelector("[data-testid='opt-Edit Folder']")).toBeTruthy();
  });

  test("managed metadata adds 'Delete Folder' option", () => {
    mockManagedMetadata = true;
    mockDialect = "rest";
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    expect(container.querySelector("[data-testid='opt-Delete Folder']")).toBeTruthy();
  });

  test("clicking 'Delete Folder' confirms and calls deleteManagedDatabase", async () => {
    mockManagedMetadata = true;
    mockDialect = "rest";
    mockConfirm.mockResolvedValue(true);
    mockDeleteManagedDatabase.mockResolvedValue(undefined);
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    fireEvent.click(container.querySelector("[data-testid='opt-Delete Folder']") as HTMLElement);
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockDeleteManagedDatabase).toHaveBeenCalledWith({
        connectionId: "c1",
        managedDatabaseId: "db1",
      }),
    );
  });

  test("'Delete Folder' swallows dismissal (confirm reject)", async () => {
    mockManagedMetadata = true;
    mockDialect = "rest";
    mockConfirm.mockRejectedValue(new Error("dismissed"));
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    fireEvent.click(container.querySelector("[data-testid='opt-Delete Folder']") as HTMLElement);
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockDeleteManagedDatabase).not.toHaveBeenCalled();
  });

  test("clicking 'Edit Folder' fetches current folder and opens modal", async () => {
    mockManagedMetadata = true;
    mockDialect = "rest";
    mockGetManagedDatabase.mockResolvedValue({ props: { variables: [{ name: "X", value: "1" }] } });
    mockModal.mockResolvedValue(undefined);
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    fireEvent.click(container.querySelector("[data-testid='opt-Edit Folder']") as HTMLElement);
    await waitFor(() => expect(mockGetManagedDatabase).toHaveBeenCalledWith("c1", "db1"));
    await waitFor(() => expect(mockModal).toHaveBeenCalled());
  });

  test("'New Blank Request' bails out when connectionId is missing", async () => {
    mockManagedMetadata = true;
    mockDialect = "rest";
    const { container } = render(<DatabaseActions connectionId="" databaseId="db1" />);
    fireEvent.click(
      container.querySelector("[data-testid='opt-New Blank Request']") as HTMLElement,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(mockCreateManagedTable).not.toHaveBeenCalled();
  });

  test("database action with onClick handler invokes it", () => {
    const onClick = vi.fn();
    mockDatabaseActions = [{ label: "CustomAction", description: "do it", icon: null, onClick }];
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    fireEvent.click(container.querySelector("[data-testid='opt-CustomAction']") as HTMLElement);
    expect(onClick).toHaveBeenCalled();
  });

  test("database action with query string fires query/apply command", () => {
    mockDatabaseActions = [
      { label: "RunQuery", description: "run it", query: "SELECT 1", icon: null },
    ];
    const { container } = render(<DatabaseActions connectionId="c1" databaseId="db1" />);
    fireEvent.click(container.querySelector("[data-testid='opt-RunQuery']") as HTMLElement);
    expect(mockSelectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "clientEvent/query/apply",
        data: expect.objectContaining({ sql: "SELECT 1" }),
      }),
    );
  });
});
