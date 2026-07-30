// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const modalMock = vi.fn();
const useGetServerConfigsMock = vi.fn();
const openExternalUrlMock = vi.fn();

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ modal: modalMock }),
}));

vi.mock("src/frontend/hooks/useServerConfigs", () => ({
  useGetServerConfigs: () => useGetServerConfigsMock(),
}));

vi.mock("src/frontend/utils/buildInfo", () => ({
  resolvePlatformLabels: (host: { platform?: string; arch?: string } | undefined) => ({
    osLabel: host?.platform === "win32" ? "Windows" : "macOS",
    archLabel: host?.arch === "x64" ? "x64 (Intel) · 64-bit" : "ARM64 (Apple Silicon) · 64-bit",
  }),
}));

vi.mock("src/frontend/platform", () => ({
  platform: { openExternalUrl: (...args: unknown[]) => openExternalUrlMock(...args) },
}));

vi.mock("src/package.json", () => ({
  default: { version: "3.0.0", engine: "Tauri" },
  version: "3.0.0",
  engine: "Tauri",
}));

// global build constants used by AboutDialog
(globalThis as any).__BUILD_CHANNEL__ = "beta";
(globalThis as any).__BUILD_COMMIT__ = "abc123";
(globalThis as any).__BUILD_DATE__ = "2024-01-01";

// Stub fetch for version check
global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ tag_name: "v3.0.0" }),
}) as any;

import { useShowAboutDialog } from "src/frontend/components/AboutDialog";

beforeEach(() => {
  modalMock.mockReset().mockResolvedValue(undefined);
  openExternalUrlMock.mockReset();
  useGetServerConfigsMock.mockReturnValue({
    data: { storageDir: "/Users/me/.sqlui-native", hostPlatform: "darwin", hostArch: "arm64" },
  });
});

function HostComp() {
  const showAbout = useShowAboutDialog();
  return <button onClick={() => showAbout()}>Show About</button>;
}

/** Clicks the trigger, waits for the async version fetch, and renders the modal body. */
async function openAboutDialog() {
  const { container } = render(<HostComp />);
  container.querySelector("button")!.click();
  await new Promise((r) => setTimeout(r, 50));
  expect(modalMock).toHaveBeenCalled();
  return render(modalMock.mock.calls[0][0].message).container;
}

describe("useShowAboutDialog", () => {
  test("returns a callable function", async () => {
    const { container } = render(<HostComp />);
    expect(container.textContent).toContain("Show About");
  });

  test("clicking trigger opens modal with About content", async () => {
    const { container } = render(<HostComp />);
    const btn = container.querySelector("button")!;
    btn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(modalMock).toHaveBeenCalled();
    const args = modalMock.mock.calls[0][0];
    expect(args.title).toBe("About");
  });

  test("handles missing storageDir", async () => {
    useGetServerConfigsMock.mockReturnValue({ data: { storageDir: "" } });
    const { container } = render(<HostComp />);
    const btn = container.querySelector("button")!;
    btn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(modalMock).toHaveBeenCalled();
  });

  test("handles newer remote version (update available)", async () => {
    (global.fetch as any).mockResolvedValueOnce({ json: () => Promise.resolve({ tag_name: "v9.9.9" }) });
    const { container } = render(<HostComp />);
    const btn = container.querySelector("button")!;
    btn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(modalMock).toHaveBeenCalled();
  });

  test("handles fetch failure gracefully", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("net"));
    const { container } = render(<HostComp />);
    const btn = container.querySelector("button")!;
    btn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(modalMock).toHaveBeenCalled();
  });
  test("renders the Latest version without the leading v", async () => {
    const body = await openAboutDialog();
    expect(body.textContent).toContain("Latest");
    expect(body.textContent).toContain("3.0.0");
    expect(body.textContent).not.toContain("v3.0.0");
  });

  test("renders the platform and architecture rows", async () => {
    const body = await openAboutDialog();
    expect(body.textContent).toContain("Platform");
    expect(body.textContent).toContain("macOS");
    expect(body.textContent).toContain("Architecture");
    expect(body.textContent).toContain("ARM64 (Apple Silicon)");
  });

  test("falls back to the runtime host reported by the server", async () => {
    useGetServerConfigsMock.mockReturnValue({ data: { storageDir: "", hostPlatform: "win32", hostArch: "x64" } });
    const body = await openAboutDialog();
    expect(body.textContent).toContain("Windows");
    expect(body.textContent).toContain("x64 (Intel)");
  });

  test("keeps the raw v-prefixed tag in the release download link", async () => {
    (global.fetch as any).mockResolvedValueOnce({ json: () => Promise.resolve({ tag_name: "v9.9.9" }) });
    const body = await openAboutDialog();
    expect(body.textContent).toContain("9.9.9");

    const downloadLink = [...body.querySelectorAll("a")].find((el) => el.textContent?.includes("Download latest version"));
    (downloadLink as HTMLElement).click();
    expect(openExternalUrlMock).toHaveBeenCalledWith("https://github.com/synle/sqlui-native/releases/tag/v9.9.9");
  });
});
