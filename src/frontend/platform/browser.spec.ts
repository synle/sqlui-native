/** @vitest-environment jsdom */
import { describe, test, expect, vi } from "vitest";
import { browserPlatform } from "src/frontend/platform/browser";

describe("browserPlatform", () => {
  test("isDesktop is false", () => {
    expect(browserPlatform.isDesktop).toBe(false);
  });

  test("openExternalUrl invokes window.open with _blank", () => {
    const spy = vi.spyOn(window, "open").mockReturnValue(null);
    browserPlatform.openExternalUrl("https://example.com");
    expect(spy).toHaveBeenCalledWith("https://example.com", "_blank");
    spy.mockRestore();
  });

  test("openAppWindow opens the hash route", () => {
    const spy = vi.spyOn(window, "open").mockReturnValue(null);
    browserPlatform.openAppWindow("/my/route");
    expect(spy).toHaveBeenCalledWith("/#/my/route");
    spy.mockRestore();
  });

  test("toggleMenuItems is a no-op", () => {
    expect(() => browserPlatform.toggleMenuItems(true, ["x", "y"])).not.toThrow();
  });

  test("executeShellCommand returns empty string", async () => {
    await expect(browserPlatform.executeShellCommand("ls")).resolves.toBe("");
  });

  test("getFilePath returns null", () => {
    const f = new File(["x"], "f.txt");
    expect(browserPlatform.getFilePath(f)).toBeNull();
  });

  test("pickFile resolves to null in browser mode", async () => {
    await expect(browserPlatform.pickFile()).resolves.toBeNull();
  });

  test("onAppCommand returns a no-op unsubscribe", () => {
    const off = browserPlatform.onAppCommand(() => {});
    expect(typeof off).toBe("function");
    expect(() => off()).not.toThrow();
  });

  test("readFileContent POSTs to /api/file and returns text", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ text: () => Promise.resolve("file contents") } as any);
    (globalThis as any).fetch = fetchSpy;
    const f = new File(["x"], "f.txt");
    await expect(browserPlatform.readFileContent(f)).resolves.toBe("file contents");
    expect(fetchSpy).toHaveBeenCalledWith("/api/file", expect.objectContaining({ method: "POST" }));
  });
});
