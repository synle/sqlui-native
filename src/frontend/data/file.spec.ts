// @vitest-environment jsdom
import { vi } from "vitest";

globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock");
globalThis.URL.revokeObjectURL = vi.fn();

import { downloadText, downloadJSON, downloadBlob } from "src/frontend/data/file";

describe("downloadText", () => {
  test("creates a link element and clicks it", () => {
    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
      setAttribute: vi.fn(),
      click: clickSpy,
    } as any);
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    downloadText("test.csv", "a,b,c");

    expect(clickSpy).toHaveBeenCalled();
    createElementSpy.mockRestore();
  });
});

describe("downloadJSON", () => {
  test("calls downloadText with JSON content", () => {
    const clickSpy = vi.fn();
    const setAttributeSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
      setAttribute: setAttributeSpy,
      click: clickSpy,
    } as any);
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    downloadJSON("test.json", { hello: "world" });

    expect(clickSpy).toHaveBeenCalled();
    // check that download attribute was set with the filename
    expect(setAttributeSpy).toHaveBeenCalledWith("download", "test.json");
    createElementSpy.mockRestore();
  });
});

describe("downloadBlob", () => {
  test("creates a link and triggers download", () => {
    const clickSpy = vi.fn();
    const setAttributeSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
      setAttribute: setAttributeSpy,
      click: clickSpy,
    } as any);
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);

    downloadBlob("image.png", "blob:http://localhost/abc");

    expect(clickSpy).toHaveBeenCalled();
    expect(setAttributeSpy).toHaveBeenCalledWith("download", "image.png");
    createElementSpy.mockRestore();
  });
});
