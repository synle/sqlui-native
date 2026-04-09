import fs from "fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import RestApiDataAdapter from "src/common/adapters/RestApiDataAdapter/index";

const HTTPBIN = "https://httpbin.org";

/** Skip httpbin tests in CI — the external service is unreliable and causes timeout flakes. */
const describeHttpbin = process.env.CI ? describe.skip : describe;

describe("RestApiDataAdapter integration (httpbin.org)", () => {
  // -- curl syntax tests --

  describeHttpbin("curl execution", () => {
    it("GET request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/get?foo=bar'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.requestMethod).toBe("GET");
      expect(result.meta?.responseBodyParsed?.args?.foo).toBe("bar");
      await adapter.disconnect();
    });

    it("POST JSON request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `curl -X POST '${HTTPBIN}/post' \\\n  -H 'Accept: application/json' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"name": "test"}'`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.requestMethod).toBe("POST");
      expect(result.meta?.responseBodyParsed?.json?.name).toBe("test");
      await adapter.disconnect();
    });

    it("POST form-urlencoded request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `curl -X POST '${HTTPBIN}/post' \\\n  -H 'Content-Type: application/x-www-form-urlencoded' \\\n  -d 'field1=value1&field2=value2'`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.responseBodyParsed?.form?.field1).toBe("value1");
      expect(result.meta?.responseBodyParsed?.form?.field2).toBe("value2");
      await adapter.disconnect();
    });

    it("PUT JSON request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `curl -X PUT '${HTTPBIN}/put' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"updated": true}'`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.requestMethod).toBe("PUT");
      expect(result.meta?.responseBodyParsed?.json?.updated).toBe(true);
      await adapter.disconnect();
    });

    it("PATCH JSON request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `curl -X PATCH '${HTTPBIN}/patch' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"patched": true}'`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.requestMethod).toBe("PATCH");
      expect(result.meta?.responseBodyParsed?.json?.patched).toBe(true);
      await adapter.disconnect();
    });

    it("DELETE request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -X DELETE '${HTTPBIN}/delete'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.requestMethod).toBe("DELETE");
      await adapter.disconnect();
    });

    it("GET with custom headers", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `curl '${HTTPBIN}/headers' \\\n  -H 'X-Custom-Header: test-value' \\\n  -H 'Accept: application/json'`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.headers?.["X-Custom-Header"]).toBe("test-value");
      await adapter.disconnect();
    });

    it("GET with basic auth", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -u 'testuser:testpass' '${HTTPBIN}/basic-auth/testuser/testpass'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.responseBodyParsed?.authenticated).toBe(true);
      await adapter.disconnect();
    });

    it("returns timing data", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/get'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.timing?.total).toBeGreaterThan(0);
      await adapter.disconnect();
    });

    it("returns response headers", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/get'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseHeaders).toBeDefined();
      // HTTP/2 uses lowercase header names
      const contentType = result.meta?.responseHeaders?.["Content-Type"] || result.meta?.responseHeaders?.["content-type"];
      expect(contentType).toContain("application/json");
      await adapter.disconnect();
    });
  });

  // -- status codes --

  describeHttpbin("status codes", () => {
    it("handles 201 Created", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -X POST '${HTTPBIN}/status/201'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(201);
      await adapter.disconnect();
    });

    it("handles 204 No Content", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -X GET '${HTTPBIN}/status/204'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(204);
      await adapter.disconnect();
    });

    it("handles 400 Bad Request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/status/400'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(400);
      await adapter.disconnect();
    });

    it("handles 404 Not Found", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/status/404'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(404);
      await adapter.disconnect();
    });

    it("handles 500 Internal Server Error", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/status/500'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(500);
      await adapter.disconnect();
    });
  });

  // -- redirects --

  describeHttpbin("redirects", () => {
    it("follows redirect with -L flag", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -L '${HTTPBIN}/redirect-to?url=${encodeURIComponent(`${HTTPBIN}/get`)}&status_code=302'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.responseBodyParsed?.url).toContain("/get");
      await adapter.disconnect();
    });

    it("returns redirect status without -L flag", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/redirect-to?url=${encodeURIComponent(`${HTTPBIN}/get`)}&status_code=302'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(302);
      await adapter.disconnect();
    });

    it("follows multiple redirects", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -L '${HTTPBIN}/redirect/3'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.responseBodyParsed?.url).toContain("/get");
      await adapter.disconnect();
    });
  });

  // -- cookies --

  describeHttpbin("cookies", () => {
    it("sends cookies via -b flag", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -b 'session=abc123; theme=dark' '${HTTPBIN}/cookies'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.cookies?.session).toBe("abc123");
      expect(result.meta?.responseBodyParsed?.cookies?.theme).toBe("dark");
      await adapter.disconnect();
    });

    it("receives Set-Cookie headers", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/cookies/set?myCookie=myValue'`);
      expect(result.ok).toBe(true);
      // httpbin /cookies/set returns a redirect; without -L, we get the Set-Cookie header
      expect(result.meta?.responseCookies).toBeDefined();
      expect(result.meta?.responseCookies?.myCookie).toBe("myValue");
      await adapter.disconnect();
    });
  });

  // -- response formats --

  describeHttpbin("response formats", () => {
    it("handles gzip-encoded response", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/gzip'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.gzipped).toBe(true);
      await adapter.disconnect();
    });

    it("handles deflate-encoded response", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/deflate'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.deflated).toBe(true);
      await adapter.disconnect();
    });

    it("handles HTML response", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/html'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBody).toContain("<html");
      // Body should NOT be parsed as JSON
      expect(result.meta?.responseBodyParsed).toBeUndefined();
      await adapter.disconnect();
    });

    it("handles XML response", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/xml'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBody).toContain("<?xml");
      expect(result.meta?.responseBodyParsed).toBeUndefined();
      await adapter.disconnect();
    });

    it("handles UTF-8 encoded response", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/encoding/utf8'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBody).toBeDefined();
      expect(result.meta?.size).toBeGreaterThan(0);
      await adapter.disconnect();
    });
  });

  // -- HEAD and OPTIONS methods --

  describeHttpbin("HEAD and OPTIONS methods", () => {
    it("HEAD request returns headers only", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -X HEAD '${HTTPBIN}/get'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.requestMethod).toBe("HEAD");
      expect(result.meta?.responseHeaders).toBeDefined();
      // HEAD returns no body
      expect(result.meta?.responseBody?.trim() || "").toBe("");
      await adapter.disconnect();
    });

    it("OPTIONS request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -X OPTIONS '${HTTPBIN}/get'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.requestMethod).toBe("OPTIONS");
      expect(result.meta?.status).toBe(200);
      await adapter.disconnect();
    });
  });

  // -- request inspection --

  describeHttpbin("request inspection", () => {
    it("GET /ip returns origin IP", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/ip'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.origin).toBeDefined();
      await adapter.disconnect();
    });

    it("GET /user-agent returns user agent", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/user-agent'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.["user-agent"]).toContain("curl");
      await adapter.disconnect();
    });

    it("GET /anything echoes full request details", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/anything?key=value' \\\n  -H 'X-Test: hello'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.method).toBe("GET");
      expect(result.meta?.responseBodyParsed?.args?.key).toBe("value");
      expect(result.meta?.responseBodyParsed?.headers?.["X-Test"]).toBe("hello");
      expect(result.meta?.responseBodyParsed?.url).toContain("/anything");
      await adapter.disconnect();
    });

    it("POST /anything echoes body", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `curl -X POST '${HTTPBIN}/anything' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"echo": true}'`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.method).toBe("POST");
      expect(result.meta?.responseBodyParsed?.json?.echo).toBe(true);
      await adapter.disconnect();
    });
  });

  // -- bearer auth --

  describeHttpbin("bearer auth", () => {
    it("GET /bearer with valid Authorization header", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/bearer' \\\n  -H 'Authorization: Bearer my-secret-token'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.responseBodyParsed?.authenticated).toBe(true);
      expect(result.meta?.responseBodyParsed?.token).toBe("my-secret-token");
      await adapter.disconnect();
    });

    it("GET /bearer without Authorization header returns 401", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/bearer'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(401);
      await adapter.disconnect();
    });
  });

  // -- delayed response --

  describeHttpbin("delayed response", () => {
    it("handles delayed response within timeout", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/delay/1'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.timing?.total).toBeGreaterThanOrEqual(1000);
      await adapter.disconnect();
    });
  });

  // -- response size --

  describeHttpbin("response size", () => {
    it("returns correct size for known-length response", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/bytes/512'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.size).toBeGreaterThan(0);
      await adapter.disconnect();
    });
  });

  // -- custom response headers --

  describeHttpbin("custom response headers", () => {
    it("returns server-set response headers", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/response-headers?X-Custom-Response=hello&X-Another=world'`);
      expect(result.ok).toBe(true);
      const headers = result.meta?.responseHeaders || {};
      // httpbin returns the custom headers (case may vary with HTTP/2)
      const customVal = headers["X-Custom-Response"] || headers["x-custom-response"];
      expect(customVal).toBe("hello");
      await adapter.disconnect();
    });
  });

  // -- multiple query parameters --

  describeHttpbin("multiple query parameters", () => {
    it("handles multiple params with same key", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/get?tag=one&tag=two&tag=three'`);
      expect(result.ok).toBe(true);
      const args = result.meta?.responseBodyParsed?.args;
      expect(args?.tag).toBeDefined();
      await adapter.disconnect();
    });

    it("handles URL-encoded query values", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/get?message=hello%20world&special=%26%3D%3F'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.args?.message).toBe("hello world");
      expect(result.meta?.responseBodyParsed?.args?.special).toBe("&=?");
      await adapter.disconnect();
    });
  });

  // -- fetch syntax tests --

  describeHttpbin("fetch execution", () => {
    it("GET request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `fetch("${HTTPBIN}/get?hello=world", { "headers": { "accept": "application/json" }, "method": "GET" });`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.requestMethod).toBe("GET");
      expect(result.meta?.responseBodyParsed?.args?.hello).toBe("world");
      await adapter.disconnect();
    });

    it("POST JSON request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `fetch("${HTTPBIN}/post", { "headers": { "accept": "application/json", "content-type": "application/json" }, "body": "{\\"name\\": \\"test\\"}", "method": "POST" });`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.requestMethod).toBe("POST");
      expect(result.meta?.responseBodyParsed?.json?.name).toBe("test");
      await adapter.disconnect();
    });

    it("POST form-urlencoded request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `fetch("${HTTPBIN}/post", { "headers": { "content-type": "application/x-www-form-urlencoded" }, "body": "a=1&b=2", "method": "POST" });`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.form?.a).toBe("1");
      expect(result.meta?.responseBodyParsed?.form?.b).toBe("2");
      await adapter.disconnect();
    });

    it("PUT JSON request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `fetch("${HTTPBIN}/put", { "headers": { "content-type": "application/json" }, "body": "{\\"updated\\": true}", "method": "PUT" });`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.requestMethod).toBe("PUT");
      expect(result.meta?.responseBodyParsed?.json?.updated).toBe(true);
      await adapter.disconnect();
    });

    it("PATCH JSON request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `fetch("${HTTPBIN}/patch", { "headers": { "content-type": "application/json" }, "body": "{\\"patched\\": true}", "method": "PATCH" });`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.requestMethod).toBe("PATCH");
      expect(result.meta?.responseBodyParsed?.json?.patched).toBe(true);
      await adapter.disconnect();
    });

    it("DELETE request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `fetch("${HTTPBIN}/delete", { "headers": { "accept": "application/json" }, "method": "DELETE" });`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.requestMethod).toBe("DELETE");
      await adapter.disconnect();
    });

    it("fetch with bearer auth header", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `fetch("${HTTPBIN}/bearer", { "headers": { "Authorization": "Bearer fetch-token-123" }, "method": "GET" });`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.responseBodyParsed?.authenticated).toBe(true);
      expect(result.meta?.responseBodyParsed?.token).toBe("fetch-token-123");
      await adapter.disconnect();
    });

    it("fetch POST to /anything echoes request", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `fetch("${HTTPBIN}/anything", { "headers": { "content-type": "application/json", "X-Fetch-Test": "yes" }, "body": "{\\"source\\": \\"fetch\\"}", "method": "POST" });`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.responseBodyParsed?.method).toBe("POST");
      expect(result.meta?.responseBodyParsed?.json?.source).toBe("fetch");
      expect(result.meta?.responseBodyParsed?.headers?.["X-Fetch-Test"]).toBe("yes");
      await adapter.disconnect();
    });
  });

  // -- variable resolution --

  describeHttpbin("variable resolution", () => {
    it("resolves {{HOST}} from connection config", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '{{HOST}}/get'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      await adapter.disconnect();
    });

    it("resolves collection variables", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}","variables":[{"key":"ENDPOINT","value":"get","enabled":true}]}`);
      const result = await adapter.execute(`curl '{{HOST}}/{{ENDPOINT}}'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      await adapter.disconnect();
    });

    it("resolves multiple collection variables in URL and headers", async () => {
      const config = JSON.stringify({
        HOST: HTTPBIN,
        variables: [
          { key: "PATH", value: "anything", enabled: true },
          { key: "TOKEN", value: "my-bearer-token", enabled: true },
        ],
      });
      const adapter = new RestApiDataAdapter(`rest://${config}`);
      const result = await adapter.execute(`curl '{{HOST}}/{{PATH}}' \\\n  -H 'Authorization: Bearer {{TOKEN}}'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.responseBodyParsed?.headers?.Authorization).toBe("Bearer my-bearer-token");
      await adapter.disconnect();
    });

    it("ignores disabled variables", async () => {
      const config = JSON.stringify({
        HOST: HTTPBIN,
        variables: [
          { key: "PATH", value: "anything", enabled: true },
          { key: "DISABLED_VAR", value: "should-not-appear", enabled: false },
        ],
      });
      const adapter = new RestApiDataAdapter(`rest://${config}`);
      // Disabled variable remains as {{DISABLED_VAR}} which causes curl to reject the URL
      // (curly braces are invalid in URLs) — confirming it was NOT resolved
      const result = await adapter.execute(`curl '{{HOST}}/{{PATH}}?q={{DISABLED_VAR}}'`);
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      await adapter.disconnect();
    });

    it("resolves dynamic {{$timestamp}} variable", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const before = Date.now();
      const result = await adapter.execute(`curl '${HTTPBIN}/get?ts={{$timestamp}}'`);
      const after = Date.now();
      expect(result.ok).toBe(true);
      const ts = Number(result.meta?.responseBodyParsed?.args?.ts);
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
      await adapter.disconnect();
    });

    it("resolves dynamic {{$randomUUID}} variable", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/get?id={{$randomUUID}}'`);
      expect(result.ok).toBe(true);
      const uuid = result.meta?.responseBodyParsed?.args?.id;
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      await adapter.disconnect();
    });

    it("resolves dynamic {{$isoTimestamp}} variable", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/get?ts={{$isoTimestamp}}'`);
      expect(result.ok).toBe(true);
      const iso = result.meta?.responseBodyParsed?.args?.ts;
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      await adapter.disconnect();
    });

    it("resolves dynamic {{$randomInt}} variable", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl '${HTTPBIN}/get?n={{$randomInt}}'`);
      expect(result.ok).toBe(true);
      const n = Number(result.meta?.responseBodyParsed?.args?.n);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1000);
      await adapter.disconnect();
    });
  });

  // -- file upload --

  describeHttpbin("file upload", () => {
    const testFilePath = "/tmp/sqlui-native-test-upload.txt";

    beforeAll(() => {
      fs.writeFileSync(testFilePath, "abc\ndef\n");
    });

    afterAll(() => {
      try {
        fs.unlinkSync(testFilePath);
      } catch (_err) {
        // cleanup is best-effort
      }
    });

    it("uploads a file with -F flag", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -X POST '${HTTPBIN}/post' \\\n  -F 'file=@${testFilePath}'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.responseBodyParsed?.files?.file).toBe("abc\ndef\n");
      await adapter.disconnect();
    });

    it("uploads a file with additional form fields", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(
        `curl -X POST '${HTTPBIN}/post' \\\n  -F 'file=@${testFilePath}' \\\n  -F 'description=my upload'`,
      );
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.responseBodyParsed?.files?.file).toBe("abc\ndef\n");
      expect(result.meta?.responseBodyParsed?.form?.description).toBe("my upload");
      await adapter.disconnect();
    });

    it("sends form fields without file", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const result = await adapter.execute(`curl -X POST '${HTTPBIN}/post' \\\n  -F 'field1=value1' \\\n  -F 'field2=value2'`);
      expect(result.ok).toBe(true);
      expect(result.meta?.status).toBe(200);
      expect(result.meta?.responseBodyParsed?.form?.field1).toBe("value1");
      expect(result.meta?.responseBodyParsed?.form?.field2).toBe("value2");
      await adapter.disconnect();
    });
  });

  // -- error handling --

  describe("error handling", () => {
    it("returns error for empty input", async () => {
      const adapter = new RestApiDataAdapter(`rest://{}`);
      const result = await adapter.execute("");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("No request to execute");
      await adapter.disconnect();
    });

    it("returns error for missing URL", async () => {
      const adapter = new RestApiDataAdapter(`rest://{}`);
      const result = await adapter.execute("curl");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("No URL found");
      await adapter.disconnect();
    });

    it("returns error for whitespace-only input", async () => {
      const adapter = new RestApiDataAdapter(`rest://{}`);
      const result = await adapter.execute("   \n\t  ");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("No request to execute");
      await adapter.disconnect();
    });
  });

  // -- authenticate --

  describe("authenticate", () => {
    it("succeeds with valid HOST", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      await expect(adapter.authenticate()).resolves.toBeUndefined();
      await adapter.disconnect();
    });

    it("succeeds with empty config (no HOST)", async () => {
      const adapter = new RestApiDataAdapter(`rest://{}`);
      await expect(adapter.authenticate()).resolves.toBeUndefined();
      await adapter.disconnect();
    });

    it("rejects invalid HOST format (no scheme)", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"not-a-url"}`);
      await expect(adapter.authenticate()).rejects.toThrow("Invalid HOST format");
      await adapter.disconnect();
    });

    it("rejects unresolvable HOST domain", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"https://this-domain-definitely-does-not-exist-xyz123.com"}`);
      await expect(adapter.authenticate()).rejects.toThrow("Cannot resolve host");
      await adapter.disconnect();
    });
  });

  // -- diagnostics --

  describeHttpbin("diagnostics", () => {
    it("runDiagnostics returns results for HEAD, GET, OPTIONS", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      const results = await adapter.runDiagnostics();
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.name)).toEqual(["HEAD", "GET", "OPTIONS"]);
      for (const r of results) {
        expect(r.success).toBe(true);
        expect(r.message).toMatch(/^\d+/);
      }
      await adapter.disconnect();
    });

    it("runDiagnostics returns empty array when no HOST", async () => {
      const adapter = new RestApiDataAdapter(`rest://{}`);
      const results = await adapter.runDiagnostics();
      expect(results).toEqual([]);
      await adapter.disconnect();
    });
  });

  // -- adapter lifecycle --

  describe("adapter lifecycle", () => {
    it("getDatabases returns empty array (folders are managed externally)", async () => {
      const adapter = new RestApiDataAdapter(`rest://{}`);
      const dbs = await adapter.getDatabases();
      expect(dbs).toHaveLength(0);
      await adapter.disconnect();
    });

    it("getTables returns empty array", async () => {
      const adapter = new RestApiDataAdapter(`rest://{}`);
      const tables = await adapter.getTables("Default");
      expect(tables).toEqual([]);
      await adapter.disconnect();
    });

    it("getColumns returns request metadata fields", async () => {
      const adapter = new RestApiDataAdapter(`rest://{}`);
      const cols = await adapter.getColumns("test", "Default");
      expect(cols.map((c) => c.name)).toContain("method");
      expect(cols.map((c) => c.name)).toContain("url");
      expect(cols.map((c) => c.name)).toContain("headers");
      await adapter.disconnect();
    });

    it("disconnect is a no-op", async () => {
      const adapter = new RestApiDataAdapter(`rest://{}`);
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });
  });
});
