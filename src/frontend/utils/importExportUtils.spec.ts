import { describe, expect, it } from "vitest";
import { detectAndParseImportFile, exportAsPostmanCollection } from "src/frontend/utils/importExportUtils";

describe("importExportUtils", () => {
  describe("detectAndParseImportFile", () => {
    it("should throw on unrecognized format", () => {
      expect(() => detectAndParseImportFile(JSON.stringify({ foo: "bar" }))).toThrow("Unsupported file format");
    });

    it("should throw on invalid JSON", () => {
      expect(() => detectAndParseImportFile("not json")).toThrow();
    });
  });

  describe("HAR import", () => {
    const makeHarEntry = (method: string, url: string, postData?: { mimeType: string; text: string }, resourceType?: string) => ({
      startedDateTime: "2026-01-01T00:00:00.000Z",
      time: 100,
      request: {
        method,
        url,
        httpVersion: "HTTP/1.1",
        headers: [{ name: "Accept", value: "application/json" }],
        queryString: [],
        postData,
        cookies: [],
        headersSize: -1,
        bodySize: -1,
      },
      response: {
        status: 200,
        statusText: "OK",
        httpVersion: "HTTP/1.1",
        headers: [],
        content: { size: 0, mimeType: "application/json" },
        redirectURL: "",
        headersSize: -1,
        bodySize: -1,
        cookies: [],
      },
      timings: { send: 0, wait: 50, receive: 50 },
      ...(resourceType ? { _resourceType: resourceType } : {}),
    });

    it("should detect HAR format", () => {
      const har = {
        log: {
          version: "1.2",
          creator: { name: "test", version: "1.0" },
          entries: [makeHarEntry("GET", "https://api.example.com/users")],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.format).toBe("har");
      expect(result.requests).toHaveLength(1);
      expect(result.folders).toHaveLength(1);
      expect(result.folders[0].name).toBe("HAR Import");
    });

    it("should filter static assets by resource type", () => {
      const har = {
        log: {
          version: "1.2",
          creator: { name: "test", version: "1.0" },
          entries: [
            makeHarEntry("GET", "https://api.example.com/users"),
            makeHarEntry("GET", "https://cdn.example.com/style.css", undefined, "stylesheet"),
            makeHarEntry("GET", "https://cdn.example.com/logo.png", undefined, "image"),
            makeHarEntry("GET", "https://cdn.example.com/app.js", undefined, "script"),
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].name).toContain("/users");
      expect(result.summary).toContain("3 static assets filtered");
    });

    it("should filter static assets by response MIME type", () => {
      const imageEntry = makeHarEntry("GET", "https://cdn.example.com/logo.png");
      imageEntry.response.content.mimeType = "image/png";
      const har = {
        log: {
          version: "1.2",
          creator: { name: "test", version: "1.0" },
          entries: [makeHarEntry("GET", "https://api.example.com/users"), imageEntry],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests).toHaveLength(1);
    });

    it("should dedup by method + URL path (ignoring query params)", () => {
      const har = {
        log: {
          version: "1.2",
          creator: { name: "test", version: "1.0" },
          entries: [
            makeHarEntry("GET", "https://api.example.com/users?page=1"),
            makeHarEntry("GET", "https://api.example.com/users?page=2"),
            makeHarEntry("GET", "https://api.example.com/users?page=3"),
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests).toHaveLength(1);
      expect(result.summary).toContain("2 duplicates removed");
    });

    it("should keep different methods for same URL", () => {
      const har = {
        log: {
          version: "1.2",
          creator: { name: "test", version: "1.0" },
          entries: [
            makeHarEntry("GET", "https://api.example.com/users"),
            makeHarEntry("POST", "https://api.example.com/users", { mimeType: "application/json", text: '{"name":"Acme"}' }),
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests).toHaveLength(2);
    });

    it("should dedup POST requests by body content", () => {
      const har = {
        log: {
          version: "1.2",
          creator: { name: "test", version: "1.0" },
          entries: [
            makeHarEntry("POST", "https://api.example.com/users", { mimeType: "application/json", text: '{"name":"Acme"}' }),
            makeHarEntry("POST", "https://api.example.com/users", { mimeType: "application/json", text: '{"name":"Acme"}' }),
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests).toHaveLength(1);
    });

    it("should keep POST requests with different bodies", () => {
      const har = {
        log: {
          version: "1.2",
          creator: { name: "test", version: "1.0" },
          entries: [
            makeHarEntry("POST", "https://api.example.com/users", { mimeType: "application/json", text: '{"name":"Acme"}' }),
            makeHarEntry("POST", "https://api.example.com/users", { mimeType: "application/json", text: '{"name":"Globex"}' }),
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests).toHaveLength(2);
    });

    it("should generate curl commands from HAR entries", () => {
      const har = {
        log: {
          version: "1.2",
          creator: { name: "test", version: "1.0" },
          entries: [makeHarEntry("POST", "https://api.example.com/users", { mimeType: "application/json", text: '{"name":"Acme"}' })],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests[0].curl).toContain("curl");
      expect(result.requests[0].curl).toContain("-X POST");
      expect(result.requests[0].curl).toContain("https://api.example.com/users");
    });
  });

  describe("Postman import", () => {
    it("should detect Postman format by schema", () => {
      const collection = {
        info: {
          name: "Acme API",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "Get Users",
            request: {
              method: "GET",
              url: "https://api.example.com/users",
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.format).toBe("postman");
      expect(result.requests).toHaveLength(1);
      expect(result.summary).toContain("Acme API");
    });

    it("should flatten nested folders with separator", () => {
      const collection = {
        info: { name: "Test", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        item: [
          {
            name: "Auth",
            item: [
              {
                name: "OAuth",
                item: [
                  {
                    name: "Get Token",
                    request: { method: "POST", url: "https://api.example.com/oauth/token" },
                  },
                ],
              },
            ],
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.folders.some((f) => f.name === "Auth - OAuth")).toBe(true);
      expect(result.requests[0].folderName).toBe("Auth - OAuth");
    });

    it("should put top-level requests in Default folder", () => {
      const collection = {
        info: { name: "Test", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        item: [
          {
            name: "Health Check",
            request: { method: "GET", url: "https://api.example.com/health" },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].folderName).toBe("Default");
    });

    it("should import collection-level variables", () => {
      const collection = {
        info: { name: "Test", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        item: [],
        variable: [
          { key: "baseUrl", value: "https://api.example.com" },
          { key: "token", value: "abc123" },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.variables).toHaveLength(2);
      expect(result.variables![0].key).toBe("baseUrl");
      expect(result.variables![0].enabled).toBe(true);
    });

    it("should convert Postman body types to curl", () => {
      const collection = {
        info: { name: "Test", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        item: [
          {
            name: "Create User",
            request: {
              method: "POST",
              url: "https://api.example.com/users",
              header: [{ key: "Authorization", value: "Bearer {{token}}" }],
              body: {
                mode: "raw",
                raw: '{"name":"Acme Corp"}',
                options: { raw: { language: "json" } },
              },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("-X POST");
      expect(result.requests[0].curl).toContain("Acme Corp");
      expect(result.requests[0].curl).toContain("Authorization");
    });

    it("should handle Bearer auth", () => {
      const collection = {
        info: { name: "Test", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        item: [
          {
            name: "Auth Request",
            request: {
              method: "GET",
              url: "https://api.example.com/me",
              auth: {
                type: "bearer",
                bearer: [{ key: "token", value: "my-secret-token" }],
              },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("Bearer my-secret-token");
    });
  });

  describe("Postman export", () => {
    it("should export as valid Postman collection v2.1", () => {
      const json = exportAsPostmanCollection({
        connectionName: "Acme API",
        folders: [{ name: "Users" }],
        requests: [
          { name: "Get Users", folderName: "Users", curl: "curl 'https://api.example.com/users'" },
          { name: "Create User", folderName: "Users", curl: "curl -X POST 'https://api.example.com/users' -d '{\"name\":\"Acme\"}'" },
        ],
        variables: [{ key: "HOST", value: "https://api.example.com", enabled: true }],
      });

      const collection = JSON.parse(json);
      expect(collection.info.name).toBe("Acme API");
      expect(collection.info.schema).toContain("getpostman.com");
      expect(collection.item).toHaveLength(1);
      expect(collection.item[0].name).toBe("Users");
      expect(collection.item[0].item).toHaveLength(2);
      expect(collection.variable).toHaveLength(1);
      expect(collection.variable[0].key).toBe("HOST");
    });

    it("should group requests by folder", () => {
      const json = exportAsPostmanCollection({
        connectionName: "Test",
        folders: [{ name: "Auth" }, { name: "Users" }],
        requests: [
          { name: "Login", folderName: "Auth", curl: "curl 'https://api.example.com/login'" },
          { name: "List Users", folderName: "Users", curl: "curl 'https://api.example.com/users'" },
        ],
      });
      const collection = JSON.parse(json);
      expect(collection.item).toHaveLength(2);
      expect(collection.item[0].name).toBe("Auth");
      expect(collection.item[1].name).toBe("Users");
    });

    it("should convert curl with headers and body to Postman request", () => {
      const json = exportAsPostmanCollection({
        connectionName: "Test",
        folders: [{ name: "Default" }],
        requests: [
          {
            name: "Create Item",
            folderName: "Default",
            curl: "curl -X POST 'https://api.example.com/items' -H 'Content-Type: application/json' -d '{\"name\":\"Globex\"}'",
          },
        ],
      });
      const collection = JSON.parse(json);
      const req = collection.item[0].item[0].request;
      expect(req.method).toBe("POST");
      expect(req.header).toBeDefined();
      expect(req.body).toBeDefined();
    });

    it("should skip empty folders", () => {
      const json = exportAsPostmanCollection({
        connectionName: "Test",
        folders: [{ name: "Empty" }, { name: "Has Requests" }],
        requests: [{ name: "Ping", folderName: "Has Requests", curl: "curl 'https://api.example.com/ping'" }],
      });
      const collection = JSON.parse(json);
      expect(collection.item).toHaveLength(1);
      expect(collection.item[0].name).toBe("Has Requests");
    });

    it("should omit variables when none provided", () => {
      const json = exportAsPostmanCollection({
        connectionName: "Test",
        folders: [{ name: "Default" }],
        requests: [{ name: "Ping", folderName: "Default", curl: "curl 'https://api.example.com/ping'" }],
      });
      const collection = JSON.parse(json);
      expect(collection.variable).toBeUndefined();
    });
  });
});
