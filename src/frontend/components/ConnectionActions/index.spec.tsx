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
  getConnectionActions: () => [],
  isDialectSupportManagedMetadata: () => false,
}));

vi.mock("src/frontend/hooks/useManagedMetadata", () => ({
  useCreateManagedDatabase: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ modal: vi.fn(), prompt: vi.fn(), dismiss: vi.fn() }),
}));

vi.mock("src/frontend/components/DropdownButton", () => ({
  default: (props: any) => <div data-testid="dropdown">{props.children}</div>,
}));

vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => ({ selectCommand: vi.fn() }),
  isConnectionRefreshing: () => false,
}));

vi.mock("src/frontend/hooks/useTreeActions", () => ({
  useTreeActions: () => ({ data: { showContextMenu: true }, setTreeActions: vi.fn() }),
}));

import ConnectionActions from "src/frontend/components/ConnectionActions";

describe("ConnectionActions", () => {
  const connection = { id: "c1", dialect: "mysql", connection: "mysql://localhost" } as any;

  test("renders dropdown when showContextMenu is true", () => {
    const { container } = render(<ConnectionActions connection={connection} />);
    expect(container.querySelector("[data-testid='dropdown']")).toBeTruthy();
  });

  test("renders Connection Actions aria-label", () => {
    const { container } = render(<ConnectionActions connection={connection} />);
    expect(container.querySelector("[aria-label='Connection Actions']")).toBeTruthy();
  });
});
