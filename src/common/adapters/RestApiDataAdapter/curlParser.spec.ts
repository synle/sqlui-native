import { describe, expect, it } from "vitest";
import { buildCurlCommand, parseCurlCommand } from "src/common/adapters/RestApiDataAdapter/curlParser";

describe("curlParser", () => {
  describe("parseCurlCommand", () => {
    it("parses simple GET", () => {
      const result = parseCurlCommand("curl https://example.com/api");
      expect(result.method).toBe("GET");
      expect(result.url).toBe("https://example.com/api");
      expect(result.body).toBeUndefined();
    });

    it("parses GET with single-quoted URL", () => {
      const result = parseCurlCommand("curl 'https://example.com/api'");
      expect(result.method).toBe("GET");
      expect(result.url).toBe("https://example.com/api");
    });

    it("parses GET with double-quoted URL", () => {
      const result = parseCurlCommand('curl "https://example.com/api"');
      expect(result.method).toBe("GET");
      expect(result.url).toBe("https://example.com/api");
    });

    it("parses explicit method with -X", () => {
      const result = parseCurlCommand("curl -X POST 'https://example.com/api'");
      expect(result.method).toBe("POST");
    });

    it("parses explicit method with --request", () => {
      const result = parseCurlCommand("curl --request DELETE 'https://example.com/api'");
      expect(result.method).toBe("DELETE");
    });

    it("parses headers with -H", () => {
      const result = parseCurlCommand("curl 'https://example.com' -H 'Accept: application/json' -H 'Authorization: Bearer abc'");
      expect(result.headers["Accept"]).toBe("application/json");
      expect(result.headers["Authorization"]).toBe("Bearer abc");
    });

    it("parses body with -d and defaults to POST", () => {
      const result = parseCurlCommand(`curl 'https://example.com' -d '{"key":"value"}'`);
      expect(result.method).toBe("POST");
      expect(result.body).toBe('{"key":"value"}');
    });

    it("parses --data-raw", () => {
      const result = parseCurlCommand(`curl -X PUT 'https://example.com' --data-raw '{"a":1}'`);
      expect(result.method).toBe("PUT");
      expect(result.body).toBe('{"a":1}');
    });

    it("parses basic auth with -u", () => {
      const result = parseCurlCommand("curl -u 'user:pass123' 'https://example.com'");
      expect(result.auth).toEqual({ username: "user", password: "pass123" });
    });

    it("parses cookies with -b", () => {
      const result = parseCurlCommand("curl -b 'session=abc123' 'https://example.com'");
      expect(result.cookies).toBe("session=abc123");
    });

    it("parses -L for follow redirects", () => {
      const result = parseCurlCommand("curl -L 'https://example.com'");
      expect(result.followRedirects).toBe(true);
    });

    it("parses -k for insecure", () => {
      const result = parseCurlCommand("curl -k 'https://example.com'");
      expect(result.insecure).toBe(true);
    });

    it("handles multi-line with backslash continuation", () => {
      const result = parseCurlCommand(`curl 'https://example.com' \\
        -H 'Accept: application/json' \\
        -H 'Content-Type: application/json' \\
        -X POST \\
        -d '{"test": true}'`);
      expect(result.method).toBe("POST");
      expect(result.headers["Accept"]).toBe("application/json");
      expect(result.headers["Content-Type"]).toBe("application/json");
      expect(result.body).toBe('{"test": true}');
    });

    it("parses form data with -F", () => {
      const result = parseCurlCommand("curl -X POST 'https://example.com' -F 'field1=value1' -F 'field2=value2'");
      expect(result.bodyType).toBe("form-data");
      expect(result.formParts).toEqual(["field1=value1", "field2=value2"]);
      expect(result.body).toBeUndefined();
    });

    it("parses file upload with -F", () => {
      const result = parseCurlCommand("curl -X POST 'https://example.com' -F 'file=@/path/to/file' -F 'description=my upload'");
      expect(result.bodyType).toBe("form-data");
      expect(result.formParts).toEqual(["file=@/path/to/file", "description=my upload"]);
    });

    it("defaults to POST when -F form parts are present without explicit method", () => {
      const result = parseCurlCommand("curl 'https://example.com/upload' -F 'file=@/path/to/file'");
      expect(result.method).toBe("POST");
      expect(result.bodyType).toBe("form-data");
      expect(result.formParts).toEqual(["file=@/path/to/file"]);
    });

    it("builds curl with -F for form parts", () => {
      const cmd = buildCurlCommand({
        method: "POST",
        url: "https://example.com",
        headers: {},
        params: {},
        formParts: ["file=@/path/to/file", "field=value"],
      });
      expect(cmd).toContain("-F 'file=@/path/to/file'");
      expect(cmd).toContain("-F 'field=value'");
      expect(cmd).not.toContain("-d");
    });

    it("preserves duplicate query params joined with comma", () => {
      const result = parseCurlCommand("curl 'https://example.com/api?tag=a&tag=b&tag=c'");
      expect(result.params["tag"]).toBe("a, b, c");
    });

    it("extracts query params from URL", () => {
      const result = parseCurlCommand("curl 'https://example.com/api?page=1&limit=10'");
      expect(result.params["page"]).toBe("1");
      expect(result.params["limit"]).toBe("10");
    });

    it("detects JSON body type from Content-Type header", () => {
      const result = parseCurlCommand("curl -X POST 'https://example.com' -H 'Content-Type: application/json' -d '{}'");
      expect(result.bodyType).toBe("json");
    });

    it("detects form-urlencoded body type", () => {
      const result = parseCurlCommand("curl -X POST 'https://example.com' -H 'Content-Type: application/x-www-form-urlencoded' -d 'a=1'");
      expect(result.bodyType).toBe("form-urlencoded");
    });

    it("ignores silent/verbose flags", () => {
      const result = parseCurlCommand("curl -s -S -v -i 'https://example.com'");
      expect(result.url).toBe("https://example.com");
      expect(result.method).toBe("GET");
    });

    it("parses --max-time flag", () => {
      const result = parseCurlCommand("curl --max-time 10 'https://example.com'");
      expect(result.maxTime).toBe(10);
    });

    it("parses -m shorthand for --max-time", () => {
      const result = parseCurlCommand("curl -m 5.5 'https://example.com'");
      expect(result.maxTime).toBe(5.5);
    });

    it("parses --connect-timeout flag", () => {
      const result = parseCurlCommand("curl --connect-timeout 3 'https://example.com'");
      expect(result.connectTimeout).toBe(3);
    });

    it("parses both --max-time and --connect-timeout together", () => {
      const result = parseCurlCommand("curl --max-time 30 --connect-timeout 5 'https://example.com'");
      expect(result.maxTime).toBe(30);
      expect(result.connectTimeout).toBe(5);
    });

    it("parses --proxy flag", () => {
      const result = parseCurlCommand("curl --proxy 'http://proxy:8080' 'https://example.com'");
      expect(result.proxy).toBe("http://proxy:8080");
    });

    it("parses -x shorthand for --proxy", () => {
      const result = parseCurlCommand("curl -x 'socks5://localhost:1080' 'https://example.com'");
      expect(result.proxy).toBe("socks5://localhost:1080");
    });

    it("skips --compressed flag without value", () => {
      const result = parseCurlCommand("curl --compressed 'https://example.com'");
      expect(result.url).toBe("https://example.com");
    });

    it("handles Chrome DevTools curl with many headers", () => {
      const result = parseCurlCommand(`curl 'http://localhost:3000/api/v1/me' \\
        -H 'Accept-Language: en-US,en;q=0.9' \\
        -H 'Connection: keep-alive' \\
        -b 'token=eyJ123' \\
        -H 'accept: application/json' \\
        -H 'content-type: application/json'`);
      expect(result.url).toBe("http://localhost:3000/api/v1/me");
      expect(result.headers["accept"]).toBe("application/json");
      expect(result.cookies).toBe("token=eyJ123");
    });
  });

  describe("buildCurlCommand", () => {
    it("builds simple GET", () => {
      const cmd = buildCurlCommand({
        method: "GET",
        url: "https://example.com",
        headers: {},
        params: {},
      });
      expect(cmd).toContain("curl");
      expect(cmd).toContain("https://example.com");
      expect(cmd).not.toContain("-X");
    });

    it("builds POST with body and headers", () => {
      const cmd = buildCurlCommand({
        method: "POST",
        url: "https://example.com",
        headers: { "Content-Type": "application/json" },
        params: {},
        body: '{"key":"value"}',
      });
      expect(cmd).toContain("-X POST");
      expect(cmd).toContain("Content-Type: application/json");
      expect(cmd).toContain("-d");
    });

    it("includes -L for follow redirects", () => {
      const cmd = buildCurlCommand({
        method: "GET",
        url: "https://example.com",
        headers: {},
        params: {},
        followRedirects: true,
      });
      expect(cmd).toContain("-L");
    });

    it("includes -k for insecure", () => {
      const cmd = buildCurlCommand({
        method: "GET",
        url: "https://example.com",
        headers: {},
        params: {},
        insecure: true,
      });
      expect(cmd).toContain("-k");
    });

    it("includes auth", () => {
      const cmd = buildCurlCommand({
        method: "GET",
        url: "https://example.com",
        headers: {},
        params: {},
        auth: { username: "user", password: "pass" },
      });
      expect(cmd).toContain("-u 'user:pass'");
    });

    it("includes --max-time and --connect-timeout", () => {
      const cmd = buildCurlCommand({
        method: "GET",
        url: "https://example.com",
        headers: {},
        params: {},
        maxTime: 30,
        connectTimeout: 5,
      });
      expect(cmd).toContain("--max-time 30");
      expect(cmd).toContain("--connect-timeout 5");
    });

    it("includes -x for proxy", () => {
      const cmd = buildCurlCommand({
        method: "GET",
        url: "https://example.com",
        headers: {},
        params: {},
        proxy: "http://proxy:8080",
      });
      expect(cmd).toContain("-x 'http://proxy:8080'");
    });
  });
});
