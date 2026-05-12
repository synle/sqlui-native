// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/** Builds a minimal Response-like mock that satisfies `.text()` callers. */
function mockFetchOnce(body: string, ok = true) {
  const fetchSpy = vi.spyOn(globalThis, "fetch" as any).mockResolvedValueOnce({
    ok,
    text: async () => body,
  } as any);
  return fetchSpy;
}

describe("browserPlatform.readFileContent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("POSTs the file as FormData under field 'file' to /api/file and returns the response text", async () => {
    const { browserPlatform } = await import("src/frontend/platform/browser");
    const fetchSpy = mockFetchOnce("acme-file-contents");

    const file = new File(["acme-file-contents"], "acme.json", {
      type: "application/json",
    });
    const text = await browserPlatform.readFileContent(file);

    expect(text).toEqual("acme-file-contents");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toEqual("/api/file");
    expect((init as RequestInit).method).toEqual("POST");
    const body = (init as RequestInit).body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("file")).toBeInstanceOf(File);
    expect((body.get("file") as File).name).toEqual("acme.json");
  });

  test("propagates fetch rejections to the caller", async () => {
    const { browserPlatform } = await import("src/frontend/platform/browser");
    vi.spyOn(globalThis, "fetch" as any).mockRejectedValueOnce(new Error("network down"));

    const file = new File(["x"], "x.json", { type: "application/json" });
    await expect(browserPlatform.readFileContent(file)).rejects.toThrow("network down");
  });
});

describe("electronPlatform.readFileContent (fallback path)", () => {
  beforeEach(() => {
    // Ensure window.requireElectron is missing so the implementation falls through
    // to the fetch-based fallback used in non-Electron environments.
    delete (window as any).requireElectron;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("falls back to POST /api/file when Electron require is unavailable", async () => {
    const { electronPlatform } = await import("src/frontend/platform/electron");
    const fetchSpy = mockFetchOnce("globex-file-contents");

    const file = new File(["globex-file-contents"], "globex.json", {
      type: "application/json",
    });
    const text = await electronPlatform.readFileContent(file);

    expect(text).toEqual("globex-file-contents");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toEqual("/api/file");
    expect((init as RequestInit).method).toEqual("POST");
    const body = (init as RequestInit).body as FormData;
    expect(body.get("file")).toBeInstanceOf(File);
    expect((body.get("file") as File).name).toEqual("globex.json");
  });

  test("uses fs.readFileSync via Electron require when available, skipping fetch", async () => {
    const readFileSync = vi.fn().mockReturnValue("from-disk-contents");
    const getPathForFile = vi.fn().mockReturnValue("/fake/path/initech.json");

    (window as any).requireElectron = (mod: string) => {
      if (mod === "fs") return { readFileSync };
      if (mod === "electron") return { webUtils: { getPathForFile } };
      throw new Error(`Unexpected require: ${mod}`);
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch" as any);

    // Re-import after stubbing requireElectron so the module sees the fresh window.
    vi.resetModules();
    const { electronPlatform } = await import("src/frontend/platform/electron");

    const file = new File(["unused"], "initech.json", {
      type: "application/json",
    });
    const text = await electronPlatform.readFileContent(file);

    expect(text).toEqual("from-disk-contents");
    expect(getPathForFile).toHaveBeenCalledWith(file);
    expect(readFileSync).toHaveBeenCalledWith("/fake/path/initech.json", {
      encoding: "utf-8",
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    delete (window as any).requireElectron;
    vi.resetModules();
  });
});

describe("tauriPlatform.readFileContent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock("@tauri-apps/api/core");
    vi.resetModules();
  });

  test("includes the sidecar baseUrl from `get_sidecar_port` invoke when available", async () => {
    vi.doMock("@tauri-apps/api/core", () => ({
      invoke: vi.fn().mockResolvedValue(54321),
    }));

    vi.resetModules();
    const { tauriPlatform } = await import("src/frontend/platform/tauri");
    const fetchSpy = mockFetchOnce("acme-tauri-contents");

    const file = new File(["acme-tauri-contents"], "tauri.json", {
      type: "application/json",
    });
    const text = await tauriPlatform.readFileContent(file);

    expect(text).toEqual("acme-tauri-contents");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toEqual("http://127.0.0.1:54321/api/file");
    expect((init as RequestInit).method).toEqual("POST");
    const body = (init as RequestInit).body as FormData;
    expect(body.get("file")).toBeInstanceOf(File);
    expect((body.get("file") as File).name).toEqual("tauri.json");
  });

  test("falls back to a relative URL when the sidecar port invoke fails", async () => {
    vi.doMock("@tauri-apps/api/core", () => ({
      invoke: vi.fn().mockRejectedValue(new Error("no sidecar")),
    }));

    vi.resetModules();
    const { tauriPlatform } = await import("src/frontend/platform/tauri");
    const fetchSpy = mockFetchOnce("relative-fallback");

    const file = new File(["x"], "x.json", { type: "application/json" });
    const text = await tauriPlatform.readFileContent(file);

    expect(text).toEqual("relative-fallback");
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toEqual("/api/file");
  });

  test("falls back to a relative URL when invoke returns 0 (no port)", async () => {
    vi.doMock("@tauri-apps/api/core", () => ({
      invoke: vi.fn().mockResolvedValue(0),
    }));

    vi.resetModules();
    const { tauriPlatform } = await import("src/frontend/platform/tauri");
    const fetchSpy = mockFetchOnce("relative-zero");

    const file = new File(["x"], "x.json", { type: "application/json" });
    await tauriPlatform.readFileContent(file);

    const [url] = fetchSpy.mock.calls[0];
    expect(url).toEqual("/api/file");
  });
});
