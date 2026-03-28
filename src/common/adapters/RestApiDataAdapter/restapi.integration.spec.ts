import { describe, expect, it } from "vitest";
import RestApiDataAdapter from "src/common/adapters/RestApiDataAdapter/index";

const HTTPBIN = "https://httpbin.org";

describe("RestApiDataAdapter integration (httpbin.org)", () => {
  // -- curl syntax tests --

  describe("curl execution", () => {
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

  // -- fetch syntax tests --

  describe("fetch execution", () => {
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
  });

  // -- variable resolution --

  describe("variable resolution", () => {
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
  });

  // -- adapter lifecycle --

  describe("adapter lifecycle", () => {
    it("authenticate succeeds with valid config", async () => {
      const adapter = new RestApiDataAdapter(`rest://{"HOST":"${HTTPBIN}"}`);
      await expect(adapter.authenticate()).resolves.toBeUndefined();
      await adapter.disconnect();
    });

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
