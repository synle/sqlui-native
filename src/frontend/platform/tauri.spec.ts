/** @vitest-environment jsdom */
import { describe, test, expect, vi, beforeEach } from "vitest";

const mockOpenUrl = vi.fn().mockResolvedValue(undefined);
const mockInvoke = vi.fn();
const mockTauriOpen = vi.fn();
const mockListen = vi.fn();

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: (...args: any[]) => mockOpenUrl(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: any[]) => mockTauriOpen(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args: any[]) => mockListen(...args),
}));

import { tauriPlatform } from "src/frontend/platform/tauri";

describe("tauriPlatform", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("isDesktop is true", () => {
    expect(tauriPlatform.isDesktop).toBe(true);
  });

  test("openExternalUrl calls plugin-opener.openUrl", async () => {
    tauriPlatform.openExternalUrl("https://example.com");
    await new Promise((r) => setTimeout(r, 0));
    expect(mockOpenUrl).toHaveBeenCalledWith("https://example.com");
  });

  test("openAppWindow opens hash route", () => {
    const spy = vi.spyOn(window, "open").mockReturnValue(null);
    tauriPlatform.openAppWindow("/route");
    expect(spy).toHaveBeenCalledWith("/#/route");
    spy.mockRestore();
  });

  test("toggleMenuItems is no-op", () => {
    expect(() => tauriPlatform.toggleMenuItems(true, ["a"])).not.toThrow();
  });

  test("executeShellCommand resolves to empty", async () => {
    await expect(tauriPlatform.executeShellCommand("ls")).resolves.toBe("");
  });

  test("getFilePath returns null", () => {
    expect(tauriPlatform.getFilePath(new File(["x"], "x.txt"))).toBeNull();
  });

  test("readFileContent uses invoke to derive baseUrl + POSTs file", async () => {
    mockInvoke.mockResolvedValueOnce(3001);
    const fetchSpy = vi.fn().mockResolvedValue({ text: () => Promise.resolve("ok") } as any);
    (globalThis as any).fetch = fetchSpy;
    const out = await tauriPlatform.readFileContent(new File(["x"], "x.txt"));
    expect(out).toBe("ok");
    expect(fetchSpy.mock.calls[0][0]).toBe("http://127.0.0.1:3001/api/file");
  });

  test("readFileContent falls back to relative URL when invoke fails", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("no sidecar"));
    const fetchSpy = vi.fn().mockResolvedValue({ text: () => Promise.resolve("ok") } as any);
    (globalThis as any).fetch = fetchSpy;
    const out = await tauriPlatform.readFileContent(new File(["x"], "x.txt"));
    expect(out).toBe("ok");
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/file");
  });

  test("pickFile returns the selected path", async () => {
    mockTauriOpen.mockResolvedValueOnce("/tmp/file.txt");
    await expect(tauriPlatform.pickFile()).resolves.toBe("/tmp/file.txt");
  });

  test("pickFile returns null when cancelled", async () => {
    mockTauriOpen.mockResolvedValueOnce(null);
    await expect(tauriPlatform.pickFile()).resolves.toBeNull();
  });

  test("pickFile returns null on error", async () => {
    mockTauriOpen.mockRejectedValueOnce(new Error("nope"));
    await expect(tauriPlatform.pickFile()).resolves.toBeNull();
  });

  test("onAppCommand returns an unsubscribe function", async () => {
    const innerUnlisten = vi.fn();
    mockListen.mockResolvedValueOnce(innerUnlisten);
    const off = tauriPlatform.onAppCommand(() => {});
    await new Promise((r) => setTimeout(r, 10));
    expect(mockListen).toHaveBeenCalledWith("menu-command", expect.any(Function));
    off();
    expect(innerUnlisten).toHaveBeenCalled();
  });
});
