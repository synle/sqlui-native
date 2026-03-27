import { describe, expect, it } from "vitest";
import { buildFetchCommand, parseFetchCommand } from "src/common/adapters/RestApiDataAdapter/fetchParser";

describe("fetchParser", () => {
  describe("parseFetchCommand", () => {
    it("parses simple GET", () => {
      const result = parseFetchCommand(`fetch("https://example.com/api", { "method": "GET" });`);
      expect(result.method).toBe("GET");
      expect(result.url).toBe("https://example.com/api");
    });

    it("parses POST with headers and body", () => {
      const result = parseFetchCommand(`fetch("https://example.com/api", {
        "headers": {
          "accept": "application/json",
          "content-type": "application/json"
        },
        "body": "{\\"key\\": \\"value\\"}",
        "method": "POST"
      });`);
      expect(result.method).toBe("POST");
      expect(result.headers["accept"]).toBe("application/json");
      expect(result.headers["content-type"]).toBe("application/json");
      expect(result.body).toBe('{"key": "value"}');
    });

    it("parses PUT method", () => {
      const result = parseFetchCommand(`fetch("https://example.com/api", { "method": "PUT", "body": "data" });`);
      expect(result.method).toBe("PUT");
      expect(result.body).toBe("data");
    });

    it("parses DELETE method", () => {
      const result = parseFetchCommand(`fetch("https://example.com/api", { "method": "DELETE" });`);
      expect(result.method).toBe("DELETE");
    });

    it("parses PATCH method", () => {
      const result = parseFetchCommand(`fetch("https://example.com/api", { "method": "PATCH", "body": "{}" });`);
      expect(result.method).toBe("PATCH");
    });

    it("defaults to GET when no method specified", () => {
      const result = parseFetchCommand(`fetch("https://example.com/api", { "headers": {} });`);
      expect(result.method).toBe("GET");
    });

    it("parses referrer into Referer header", () => {
      const result = parseFetchCommand(`fetch("https://example.com/api", {
        "referrer": "https://example.com/page",
        "method": "GET"
      });`);
      expect(result.headers["Referer"]).toBe("https://example.com/page");
    });

    it("handles null body", () => {
      const result = parseFetchCommand(`fetch("https://example.com/api", { "body": null, "method": "GET" });`);
      expect(result.body).toBeUndefined();
    });

    it("extracts query params from URL", () => {
      const result = parseFetchCommand(`fetch("https://example.com/api?page=2&size=10", { "method": "GET" });`);
      expect(result.params["page"]).toBe("2");
      expect(result.params["size"]).toBe("10");
    });

    it("detects JSON body type", () => {
      const result = parseFetchCommand(`fetch("https://example.com", {
        "headers": { "content-type": "application/json" },
        "body": "{}",
        "method": "POST"
      });`);
      expect(result.bodyType).toBe("json");
    });

    it("detects form-urlencoded body type", () => {
      const result = parseFetchCommand(`fetch("https://example.com", {
        "headers": { "content-type": "application/x-www-form-urlencoded" },
        "body": "a=1",
        "method": "POST"
      });`);
      expect(result.bodyType).toBe("form-urlencoded");
    });

    it("parses Chrome DevTools fetch format", () => {
      const result = parseFetchCommand(`fetch("http://localhost:3000/api/v1/me", {
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors"
        },
        "referrer": "http://localhost:3000/self-review/view/10",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
      });`);
      expect(result.method).toBe("GET");
      expect(result.url).toBe("http://localhost:3000/api/v1/me");
      expect(result.headers["accept"]).toContain("application/json");
      expect(result.headers["Referer"]).toBe("http://localhost:3000/self-review/view/10");
    });
  });

  describe("buildFetchCommand", () => {
    it("builds GET request", () => {
      const cmd = buildFetchCommand({
        method: "GET",
        url: "https://example.com",
        headers: { accept: "application/json" },
        params: {},
      });
      expect(cmd).toContain('fetch("https://example.com"');
      expect(cmd).toContain('"method": "GET"');
      expect(cmd).toContain('"accept": "application/json"');
    });

    it("builds POST with body", () => {
      const cmd = buildFetchCommand({
        method: "POST",
        url: "https://example.com",
        headers: { "content-type": "application/json" },
        params: {},
        body: '{"key":"value"}',
      });
      expect(cmd).toContain('"method": "POST"');
      expect(cmd).toContain('"body"');
    });
  });
});
