// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router";

const useGetCurrentSessionMock = vi.fn();
const useCommandsMock = vi.fn();
const useActionDialogsMock = vi.fn();
const useToastHistoryCountMock = vi.fn();
const useGetServerConfigsMock = vi.fn();
const useNavigateMock = vi.fn();
const backupDatabaseMock = vi.fn();

vi.mock("src/frontend/hooks/useSession", () => ({
  useGetCurrentSession: () => useGetCurrentSessionMock(),
}));
vi.mock("src/frontend/components/MissionControl", () => ({
  useCommands: () => useCommandsMock(),
}));
vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => useActionDialogsMock(),
}));
vi.mock("src/frontend/hooks/useToaster", () => ({
  useToastHistoryCount: () => useToastHistoryCountMock(),
}));
vi.mock("src/frontend/hooks/useServerConfigs", () => ({
  useGetServerConfigs: () => useGetServerConfigsMock(),
}));
vi.mock("src/frontend/utils/commonUtils", () => ({
  useNavigate: () => useNavigateMock,
}));
vi.mock("src/frontend/data/api", () => ({
  default: { backupDatabase: () => backupDatabaseMock() },
}));
vi.mock("src/frontend/components/ToastHistoryList", () => ({
  default: () => <div>ToastHistoryList</div>,
}));
vi.mock("src/frontend/components/DropdownButton", () => ({
  default: ({ children, options }: any) => (
    <div data-testid="dropdown">
      {children}
      <ul>
        {options.map((o: any, i: number) => (
          <li key={i}>{o.label}</li>
        ))}
      </ul>
    </div>
  ),
}));
vi.mock("src/frontend/utils/buildInfo", () => ({
  getBuildBadge: () => "BUILDBADGE",
}));

import AppHeader from "src/frontend/components/AppHeader";

beforeEach(() => {
  useGetCurrentSessionMock.mockReturnValue({ data: { name: "Session A" }, isLoading: false });
  useCommandsMock.mockReturnValue({ selectCommand: vi.fn() });
  useActionDialogsMock.mockReturnValue({ modal: vi.fn().mockResolvedValue(undefined) });
  useToastHistoryCountMock.mockReturnValue(0);
  useGetServerConfigsMock.mockReturnValue({ data: undefined });
  delete (window as any).__SQLUI_PORTAL_SESSION__;
});

afterEach(() => {
  delete (window as any).__SQLUI_PORTAL_SESSION__;
});

describe("AppHeader", () => {
  test("renders SQLUI NATIVE title and session name (desktop mode)", () => {
    const { container } = render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("SQLUI NATIVE");
    expect(container.textContent).toContain("Session A");
    expect(document.title).toBe("Session A");
  });

  test("default title to 'SQLUI Native' when no session name", () => {
    useGetCurrentSessionMock.mockReturnValue({ data: undefined, isLoading: true });
    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(document.title).toBe("SQLUI Native");
  });

  test("portal mode shows Portal suffix with PID and storage", () => {
    (window as any).__SQLUI_PORTAL_SESSION__ = "portal";
    useGetServerConfigsMock.mockReturnValue({
      data: { serverPid: 12345, storageDir: "/home/u/.sqlui-portal" },
    });
    const { container } = render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Portal (PID=12345)");
    expect(container.textContent).toContain("/home/u/.sqlui-portal");
  });

  test("portal mode without serverConfigs shows base Portal", () => {
    (window as any).__SQLUI_PORTAL_SESSION__ = "portal";
    useGetServerConfigsMock.mockReturnValue({ data: undefined });
    const { container } = render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Portal");
  });

  test("renders dropdown menu options", () => {
    const { container } = render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("Settings");
    expect(container.textContent).toContain("Bookmarks");
    expect(container.textContent).toContain("Backup Database");
    expect(container.textContent).toContain("Check for update");
  });

  test("badge shows toastHistoryCount", () => {
    useToastHistoryCountMock.mockReturnValue(5);
    const { container } = render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>,
    );
    expect(container.textContent).toContain("5");
  });
});
