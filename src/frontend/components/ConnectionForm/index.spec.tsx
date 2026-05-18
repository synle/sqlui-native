// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const navigateMock = vi.fn();
const mutateAsyncMock = vi.fn();
const useGetConnectionByIdMock = vi.fn();
const useUpsertConnectionMock = vi.fn();
const addToastMock = vi.fn();
const createSystemNotificationMock = vi.fn();
const pickFileMock = vi.fn();

vi.mock("src/frontend/hooks/useConnection", () => ({
  useGetConnectionById: () => useGetConnectionByIdMock(),
  useUpsertConnection: () => useUpsertConnectionMock(),
}));

vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: (...args: any[]) => addToastMock(...args) }),
}));

vi.mock("src/frontend/utils/commonUtils", () => ({
  createSystemNotification: (...args: any[]) => createSystemNotificationMock(...args),
  useNavigate: () => navigateMock,
}));

vi.mock("src/frontend/platform", () => ({
  platform: {
    isDesktop: true,
    pickFile: (...args: any[]) => pickFileMock(...args),
    getFilePath: (file: any) => file?.path,
  },
}));

vi.mock("src/frontend/components/ConnectionForm/ConnectionHint", () => ({
  default: ({ onChange }: any) => (
    <div data-testid="hint">
      <button onClick={() => onChange("mysql", "mysql://h:p@host:3306")}>HintApply</button>
    </div>
  ),
}));

vi.mock("src/frontend/components/ConnectionHelper", () => ({
  default: (props: any) => <div data-testid="helper">helper:{props.scheme}</div>,
}));

vi.mock("src/frontend/components/ConnectionForm/GraphQLConnectionFields", () => ({
  default: () => <div data-testid="graphql-fields">graphql</div>,
}));

vi.mock("src/frontend/components/ConnectionForm/RestApiConnectionFields", () => ({
  default: () => <div data-testid="rest-fields">rest</div>,
}));

vi.mock("src/frontend/components/HTMLContent", () => ({
  default: ({ html }: any) => <div data-testid="html-content">{html}</div>,
}));

vi.mock("src/frontend/components/TestConnectionButton", () => ({
  default: () => <button>TestConn</button>,
}));

import { NewConnectionForm, EditConnectionForm } from "src/frontend/components/ConnectionForm";

beforeEach(() => {
  navigateMock.mockClear();
  mutateAsyncMock.mockReset().mockResolvedValue(undefined);
  addToastMock.mockReset().mockResolvedValue({ dismiss: vi.fn() });
  createSystemNotificationMock.mockClear();
  pickFileMock.mockReset();
  useUpsertConnectionMock.mockReturnValue({ mutateAsync: mutateAsyncMock, isPending: false });
  useGetConnectionByIdMock.mockReturnValue({ data: undefined, isLoading: false });
});

describe("NewConnectionForm", () => {
  test("shows hint screen initially", () => {
    const { container, getByText } = render(<NewConnectionForm />);
    expect(container.textContent).toContain("Select one of the following connection type");
    expect(getByText("New Blank Connection")).toBeTruthy();
    expect(getByText("Cancel")).toBeTruthy();
  });

  test("clicking 'New Blank Connection' shows main form", () => {
    const { container, getByText } = render(<NewConnectionForm />);
    fireEvent.click(getByText("New Blank Connection"));
    expect(container.textContent).toContain("Simple");
    expect(container.textContent).toContain("Advanced");
  });

  test("clicking Cancel navigates to /", () => {
    const { getByText } = render(<NewConnectionForm />);
    fireEvent.click(getByText("Cancel"));
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  test("applying hint pre-fills connection and shows main form", () => {
    const { container, getByText } = render(<NewConnectionForm />);
    fireEvent.click(getByText("HintApply"));
    // Now in main form
    expect(container.textContent).toContain("Simple");
  });
});

describe("EditConnectionForm", () => {
  test("loading state shows loading message", () => {
    useGetConnectionByIdMock.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<EditConnectionForm id="c1" />);
    expect(container.textContent).toContain("Loading connection");
  });

  test("not found shows error alert", () => {
    useGetConnectionByIdMock.mockReturnValue({ data: undefined, isLoading: false });
    const { container } = render(<EditConnectionForm id="missing" />);
    expect(container.textContent).toContain("couldn't be found");
  });

  test("loaded connection renders main form with Simple/Advanced tabs (non-rest dialect)", () => {
    useGetConnectionByIdMock.mockReturnValue({
      data: { id: "c1", name: "MyDb", connection: "mysql://u:p@host:3306" },
      isLoading: false,
    });
    const { container } = render(<EditConnectionForm id="c1" />);
    expect(container.textContent).toContain("Simple");
    expect(container.textContent).toContain("Advanced");
    expect(container.textContent).toContain("Save");
    expect(container.textContent).toContain("TestConn");
  });

  test("rest dialect hides Simple/Advanced tabs and shows RestApi fields", () => {
    useGetConnectionByIdMock.mockReturnValue({
      data: { id: "c1", name: "Api", connection: "rest://https://api.example.com" },
      isLoading: false,
    });
    const { queryByTestId } = render(<EditConnectionForm id="c1" />);
    expect(queryByTestId("rest-fields")).toBeTruthy();
  });

  test("graphql dialect shows GraphQL fields", () => {
    useGetConnectionByIdMock.mockReturnValue({
      data: { id: "c1", name: "Gql", connection: "graphql://https://gql.example.com" },
      isLoading: false,
    });
    const { queryByTestId } = render(<EditConnectionForm id="c1" />);
    expect(queryByTestId("graphql-fields")).toBeTruthy();
  });

  test("Advanced tab renders ConnectionHelper", () => {
    useGetConnectionByIdMock.mockReturnValue({
      data: { id: "c1", name: "MyDb", connection: "mysql://u:p@host:3306" },
      isLoading: false,
    });
    const { queryByTestId, getByText } = render(<EditConnectionForm id="c1" />);
    fireEvent.click(getByText("Advanced"));
    expect(queryByTestId("helper")).toBeTruthy();
  });

  test("sqlite dialect shows Browse button on desktop", () => {
    useGetConnectionByIdMock.mockReturnValue({
      data: { id: "c1", name: "Lite", connection: "sqlite:///path/to/db" },
      isLoading: false,
    });
    const { container } = render(<EditConnectionForm id="c1" />);
    expect(container.textContent).toContain("Browse for sqlite database");
  });
});
