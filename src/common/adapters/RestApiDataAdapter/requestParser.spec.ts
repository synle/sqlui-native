import { describe, expect, it } from "vitest";
import { buildCommand, detectAndParse, detectFormat } from "src/common/adapters/RestApiDataAdapter/requestParser";

describe("requestParser", () => {
  describe("detectFormat", () => {
    it("detects curl", () => {
      expect(detectFormat("curl https://example.com")).toBe("curl");
    });

    it("detects fetch with no space", () => {
      expect(detectFormat('fetch("https://example.com")')).toBe("fetch");
    });

    it("detects fetch with space", () => {
      expect(detectFormat('fetch ("https://example.com")')).toBe("fetch");
    });

    it("defaults to curl for unknown input", () => {
      expect(detectFormat("https://example.com")).toBe("curl");
    });
  });

  describe("detectAndParse", () => {
    it("auto-parses curl", () => {
      const result = detectAndParse("curl -X POST 'https://example.com' -d '{}'");
      expect(result.method).toBe("POST");
      expect(result.url).toBe("https://example.com");
    });

    it("auto-parses fetch", () => {
      const result = detectAndParse(`fetch("https://example.com", { "method": "DELETE" });`);
      expect(result.method).toBe("DELETE");
      expect(result.url).toBe("https://example.com");
    });
  });

  describe("buildCommand", () => {
    const request = {
      method: "GET" as const,
      url: "https://example.com",
      headers: { Accept: "application/json" },
      params: {},
    };

    it("builds curl format", () => {
      const cmd = buildCommand(request, "curl");
      expect(cmd).toContain("curl");
      expect(cmd).toContain("https://example.com");
    });

    it("builds fetch format", () => {
      const cmd = buildCommand(request, "fetch");
      expect(cmd).toContain("fetch(");
      expect(cmd).toContain("https://example.com");
    });
  });
});
