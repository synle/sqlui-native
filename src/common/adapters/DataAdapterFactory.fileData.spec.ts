import { describe, expect, test, vi } from "vitest";

vi.mock("src/common/utils/debugLogger", () => ({ writeDebugLog: vi.fn() }));

import FileDataAdapter from "src/common/adapters/FileDataAdapter";
import { getDataAdapter } from "src/common/adapters/DataAdapterFactory";

describe("DataAdapterFactory file adapter routing", () => {
  test.each([
    ["json", "json"],
    ["jsonc", "jsonc"],
    ["yaml", "yaml"],
    ["yml", "yml"],
    ["toml", "toml"],
    ["xml", "xml"],
  ])("routes %s URIs to the file adapter", (dialect, extension) => {
    const adapter = getDataAdapter(`${dialect}:///tmp/config.${extension}`);

    expect(adapter).toBeInstanceOf(FileDataAdapter);
    expect(adapter.dialect).toBe(dialect);
  });

  test("omits local file paths from adapter construction errors", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => getDataAdapter("json://relative/private-document.json")).toThrow("absolute filesystem path");
      const loggedText = errorSpy.mock.calls
        .flat()
        .map((value) => String(value))
        .join(" ");
      expect(loggedText).not.toContain("private-document.json");
      expect(loggedText).toContain("json");
    } finally {
      errorSpy.mockRestore();
    }
  });
});
