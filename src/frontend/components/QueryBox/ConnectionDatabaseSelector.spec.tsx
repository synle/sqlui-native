// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("src/common/adapters/DataScriptFactory", () => ({
  getIsTableIdRequiredForQueryByDialect: () => true,
}));

vi.mock("src/frontend/components/ConnectionTypeIcon", () => ({
  default: () => <span data-testid="connection-type-icon" />,
}));

vi.mock("src/frontend/components/Select", () => ({
  default: (props: any) => (
    <select data-testid={props.label} disabled={props.disabled}>
      {props.children}
    </select>
  ),
}));

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnections: () => ({ data: [], isLoading: false }),
  useGetConnectionById: () => ({ data: undefined }),
  useGetDatabases: () => ({ data: [], isLoading: false }),
  useGetTables: () => ({ data: [], isLoading: false }),
}));

import ConnectionDatabaseSelector from "src/frontend/components/QueryBox/ConnectionDatabaseSelector";

describe("ConnectionDatabaseSelector", () => {
  const defaultProps = {
    value: { connectionId: "", databaseId: "", tableId: "" },
    onChange: vi.fn(),
  };

  test("renders without crashing", () => {
    const { container } = render(<ConnectionDatabaseSelector {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  test("renders Connection and Database selects", () => {
    const { container } = render(<ConnectionDatabaseSelector {...defaultProps} />);
    const selects = container.querySelectorAll("select");
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });
});
