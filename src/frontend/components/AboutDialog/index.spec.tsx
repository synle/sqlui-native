// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

const modalMock = vi.fn();
const useGetServerConfigsMock = vi.fn();

vi.mock("src/frontend/hooks/useActionDialogs", () => ({
  useActionDialogs: () => ({ modal: modalMock }),
}));

vi.mock("src/frontend/hooks/useServerConfigs", () => ({
  useGetServerConfigs: () => useGetServerConfigsMock(),
}));

vi.mock("src/frontend/utils/buildInfo", () => ({
  getArchLabel: () => "arm64",
}));

vi.mock("src/frontend/platform", () => ({
  platform: { openExternalUrl: vi.fn() },
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
  useGetServerConfigsMock.mockReturnValue({ data: { storageDir: "/Users/me/.sqlui-native" } });
});

function HostComp() {
  const showAbout = useShowAboutDialog();
  return <button onClick={() => showAbout()}>Show About</button>;
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
});
