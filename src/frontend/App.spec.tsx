// @vitest-environment jsdom
import { render, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { MemoryRouter } from "react-router";

const hoisted = vi.hoisted(() => ({
  useGetSessionsMock: vi.fn(),
  selectCommandMock: vi.fn(),
  addToastMock: vi.fn(),
  readFileContentMock: vi.fn(),
}));

vi.mock("src/frontend/components/AppHeader", () => ({
  default: () => <header data-testid="app-header" />,
}));
vi.mock("src/frontend/components/MissionControl", () => ({
  default: () => <div data-testid="mission-control" />,
  useCommands: () => ({ selectCommand: hoisted.selectCommandMock }),
}));
vi.mock("src/frontend/components/SessionManager", () => ({
  default: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("src/frontend/hooks/useSession", () => ({
  useGetSessions: () => hoisted.useGetSessionsMock(),
}));
vi.mock("src/frontend/hooks/useToaster", () => ({
  default: () => ({ add: hoisted.addToastMock, dismiss: vi.fn() }),
}));
vi.mock("src/frontend/data/api", () => ({
  default: { readFileContent: hoisted.readFileContentMock },
}));
vi.mock("src/frontend/monacoSetup", () => ({
  monaco: {
    languages: {
      typescript: {
        javascriptDefaults: { setCompilerOptions: vi.fn() },
      },
    },
  },
}));
// Lazy-loaded route components - stub all of them
vi.mock("src/frontend/views/BookmarksPage", () => ({ default: () => <div>BookmarksPage</div> }));
vi.mock("src/frontend/views/EditConnectionPage", () => ({
  default: () => <div>EditConnectionPage</div>,
}));
vi.mock("src/frontend/views/MainPage", () => ({ default: () => <div>MainPage</div> }));
vi.mock("src/frontend/views/MigrationPage", () => ({ default: () => <div>MigrationPage</div> }));
vi.mock("src/frontend/views/NewConnectionPage", () => ({
  default: () => <div>NewConnectionPage</div>,
}));
vi.mock("src/frontend/views/RecordPage", () => ({
  default: () => <div>RecordPage</div>,
  NewRecordPage: () => <div>NewRecordPage</div>,
}));
vi.mock("src/frontend/views/QueryHistoryPage", () => ({
  default: () => <div>QueryHistoryPage</div>,
}));
vi.mock("src/frontend/views/RecycleBinPage", () => ({ default: () => <div>RecycleBinPage</div> }));
vi.mock("src/frontend/views/RelationshipChartPage", () => ({
  default: () => <div>RelationshipChartPage</div>,
}));

import App from "src/frontend/App";

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.useGetSessionsMock.mockReturnValue({ data: [] });
    hoisted.addToastMock.mockResolvedValue({ dismiss: vi.fn() });
    hoisted.readFileContentMock.mockResolvedValue("contents");
  });

  test("renders MainPage at /", async () => {
    const { container, findByText } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByText("MainPage")).toBeTruthy();
  });

  test("renders NewConnectionPage at /connection/new", async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={["/connection/new"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByText("NewConnectionPage")).toBeTruthy();
  });

  test("renders EditConnectionPage at /connection/edit/:id", async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={["/connection/edit/c1"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByText("EditConnectionPage")).toBeTruthy();
  });

  test("renders MigrationPage at /migration", async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={["/migration"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByText("MigrationPage")).toBeTruthy();
  });

  test("renders MigrationPage at /migration/raw_json", async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={["/migration/raw_json"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByText("MigrationPage")).toBeTruthy();
  });

  test("renders QueryHistoryPage at /query_history", async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={["/query_history"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByText("QueryHistoryPage")).toBeTruthy();
  });

  test("renders RecycleBinPage at /recycle_bin", async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={["/recycle_bin"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByText("RecycleBinPage")).toBeTruthy();
  });

  test("renders BookmarksPage at /bookmarks", async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={["/bookmarks"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByText("BookmarksPage")).toBeTruthy();
  });

  test("renders NewRecordPage at /record/new", async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={["/record/new"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByText("NewRecordPage")).toBeTruthy();
  });

  test("renders RelationshipChartPage at /visualization/:id", async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={["/visualization/c1"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByText("RelationshipChartPage")).toBeTruthy();
  });

  test("renders MissionControl alongside routes", async () => {
    const { findByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByTestId("mission-control")).toBeTruthy();
  });

  test("renders AppHeader", async () => {
    const { findByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );
    expect(await findByTestId("app-header")).toBeTruthy();
  });
});
