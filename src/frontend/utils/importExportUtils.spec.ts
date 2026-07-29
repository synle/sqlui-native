import { describe, expect, it } from "vitest";
import {
  detectAndParseImportFile,
  exportAsPostmanCollection,
} from "src/frontend/utils/importExportUtils";

describe("importExportUtils", () => {
  describe("detectAndParseImportFile", () => {
    it("should throw on unrecognized format", () => {
      expect(() => detectAndParseImportFile(JSON.stringify({ foo: "bar" }))).toThrow(
        "Unsupported file format",
      );
    });

    it("should throw on invalid JSON", () => {
      expect(() => detectAndParseImportFile("not json")).toThrow();
    });
  });

  describe("HAR import", () => {
    const makeHarEntry = (
      method: string,
      url: string,
      postData?: { mimeType: string; text: string },
      resourceType?: string,
    ) => ({
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
            makeHarEntry("POST", "https://api.example.com/users", {
              mimeType: "application/json",
              text: '{"name":"Acme"}',
            }),
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
            makeHarEntry("POST", "https://api.example.com/users", {
              mimeType: "application/json",
              text: '{"name":"Acme"}',
            }),
            makeHarEntry("POST", "https://api.example.com/users", {
              mimeType: "application/json",
              text: '{"name":"Acme"}',
            }),
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
            makeHarEntry("POST", "https://api.example.com/users", {
              mimeType: "application/json",
              text: '{"name":"Acme"}',
            }),
            makeHarEntry("POST", "https://api.example.com/users", {
              mimeType: "application/json",
              text: '{"name":"Globex"}',
            }),
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
          entries: [
            makeHarEntry("POST", "https://api.example.com/users", {
              mimeType: "application/json",
              text: '{"name":"Acme"}',
            }),
          ],
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
        info: {
          name: "Test",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "Auth",
            item: [
              {
                name: "OAuth",
                item: [
                  {
                    name: "Get Token",
                    request: {
                      method: "POST",
                      url: "https://api.example.com/oauth/token",
                    },
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
        info: {
          name: "Test",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
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
        info: {
          name: "Test",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
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
        info: {
          name: "Test",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
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
        info: {
          name: "Test",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
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
          {
            name: "Get Users",
            folderName: "Users",
            curl: "curl 'https://api.example.com/users'",
          },
          {
            name: "Create User",
            folderName: "Users",
            curl: "curl -X POST 'https://api.example.com/users' -d '{\"name\":\"Acme\"}'",
          },
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
          {
            name: "Login",
            folderName: "Auth",
            curl: "curl 'https://api.example.com/login'",
          },
          {
            name: "List Users",
            folderName: "Users",
            curl: "curl 'https://api.example.com/users'",
          },
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
        requests: [
          {
            name: "Ping",
            folderName: "Has Requests",
            curl: "curl 'https://api.example.com/ping'",
          },
        ],
      });
      const collection = JSON.parse(json);
      expect(collection.item).toHaveLength(1);
      expect(collection.item[0].name).toBe("Has Requests");
    });

    it("should omit variables when none provided", () => {
      const json = exportAsPostmanCollection({
        connectionName: "Test",
        folders: [{ name: "Default" }],
        requests: [
          {
            name: "Ping",
            folderName: "Default",
            curl: "curl 'https://api.example.com/ping'",
          },
        ],
      });
      const collection = JSON.parse(json);
      expect(collection.variable).toBeUndefined();
    });
  });

  describe("Postman edge cases", () => {
    it("should handle empty Postman collection (no items, no variables)", () => {
      const collection = {
        info: {
          name: "Acme Empty",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.format).toBe("postman");
      expect(result.folders).toEqual([]);
      expect(result.requests).toEqual([]);
      expect(result.variables).toEqual([]);
    });

    it("should flatten deeply nested folders (3+ levels) into single ' - '-joined names", () => {
      const collection = {
        info: {
          name: "Deep",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "Level1",
            item: [
              {
                name: "Level2",
                item: [
                  {
                    name: "Level3",
                    item: [
                      {
                        name: "DeepRequest",
                        request: {
                          method: "GET",
                          url: "https://api.example.com/deep",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].folderName).toBe("Level1 - Level2 - Level3");
      expect(result.folders.some((f) => f.name === "Level1 - Level2 - Level3")).toBe(true);
    });

    it("should handle Postman request with auth=null without throwing", () => {
      const collection = {
        info: {
          name: "AuthNull",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "No Auth",
            request: {
              method: "GET",
              url: "https://api.example.com/x",
              auth: null,
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].curl).toContain("https://api.example.com/x");
    });

    it("should handle Postman with raw body that's not JSON without crashing", () => {
      const collection = {
        info: {
          name: "RawNonJson",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "Plain Text Post",
            request: {
              method: "POST",
              url: "https://api.example.com/text",
              body: { mode: "raw", raw: "plain text body, not JSON" },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].curl).toContain("plain text body");
    });

    it("should handle Postman URL given as plain string", () => {
      const collection = {
        info: {
          name: "StringUrl",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "StringUrl",
            request: {
              method: "GET",
              url: "https://api.example.com/string-url",
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("https://api.example.com/string-url");
    });

    it("should handle Postman urlencoded body", () => {
      const collection = {
        info: {
          name: "UrlEnc",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "UrlEnc Post",
            request: {
              method: "POST",
              url: "https://api.example.com/form",
              body: {
                mode: "urlencoded",
                urlencoded: [
                  { key: "name", value: "Initech" },
                  { key: "role", value: "admin" },
                ],
              },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("application/x-www-form-urlencoded");
      expect(result.requests[0].curl).toContain("Initech");
    });

    it("should detect Postman v2.0 schema via the schema string and parse it", () => {
      // The detector accepts any schema URL containing "getpostman.com" — v2.0 should not throw.
      const collection = {
        info: {
          name: "V20",
          schema: "https://schema.getpostman.com/json/collection/v2.0.0/collection.json",
        },
        item: [
          {
            name: "Hello",
            request: { method: "GET", url: "https://api.example.com/v20" },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.format).toBe("postman");
      expect(result.requests).toHaveLength(1);
    });
  });

  describe("HAR edge cases", () => {
    it("should handle HAR with empty entries", () => {
      const har = {
        log: {
          version: "1.2",
          creator: { name: "test", version: "1.0" },
          entries: [],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.format).toBe("har");
      expect(result.requests).toEqual([]);
      // Folder is created regardless (default "HAR Import")
      expect(result.folders).toHaveLength(1);
    });
  });

  describe("Postman export — additional edge cases", () => {
    it("exports with zero requests as a valid empty-item collection", () => {
      const json = exportAsPostmanCollection({
        connectionName: "Acme Empty",
        folders: [],
        requests: [],
      });
      const collection = JSON.parse(json);
      expect(collection.info.name).toBe("Acme Empty");
      expect(collection.item).toEqual([]);
      expect(collection.variable).toBeUndefined();
    });

    it("preserves variable values containing quotes and newlines", () => {
      const tricky = 'line1\n"quoted"\tline2';
      const json = exportAsPostmanCollection({
        connectionName: "VarTest",
        folders: [],
        requests: [],
        variables: [{ key: "tricky", value: tricky, enabled: true }],
      });
      const collection = JSON.parse(json);
      expect(collection.variable).toHaveLength(1);
      expect(collection.variable[0].value).toEqual(tricky);
    });

    it("drops disabled variables from the export", () => {
      const json = exportAsPostmanCollection({
        connectionName: "DisabledVars",
        folders: [],
        requests: [],
        variables: [
          { key: "keep", value: "yes", enabled: true },
          { key: "drop", value: "no", enabled: false },
        ],
      });
      const collection = JSON.parse(json);
      expect(collection.variable).toHaveLength(1);
      expect(collection.variable[0].key).toBe("keep");
    });

    it("routes requests with unknown folder names into a synthetic Default folder", () => {
      const json = exportAsPostmanCollection({
        connectionName: "Orphan",
        folders: [{ name: "Known" }],
        requests: [
          {
            name: "Orphan Req",
            folderName: "Unknown",
            curl: "curl 'https://api.example.com/o'",
          },
        ],
      });
      const collection = JSON.parse(json);
      const folderNames = collection.item.map((f: any) => f.name);
      expect(folderNames).toContain("Default");
      const defaultFolder = collection.item.find((f: any) => f.name === "Default");
      expect(defaultFolder.item).toHaveLength(1);
      expect(defaultFolder.item[0].name).toEqual("Orphan Req");
    });
  });

  describe("Round-trip stability (Postman import → export → import)", () => {
    it("preserves request count, methods, and folder structure across a round-trip", () => {
      const original = {
        info: {
          name: "Acme RT",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "Users",
            item: [
              {
                name: "List Users",
                request: {
                  method: "GET",
                  url: "https://api.example.com/users",
                },
              },
              {
                name: "Create User",
                request: {
                  method: "POST",
                  url: "https://api.example.com/users",
                  header: [{ key: "Content-Type", value: "application/json" }],
                  body: {
                    mode: "raw",
                    raw: '{"name":"Globex"}',
                    options: { raw: { language: "json" } },
                  },
                },
              },
            ],
          },
          {
            name: "Orders",
            item: [
              {
                name: "List Orders",
                request: {
                  method: "GET",
                  url: "https://api.example.com/orders",
                },
              },
            ],
          },
        ],
      };

      const firstImport = detectAndParseImportFile(JSON.stringify(original));
      expect(firstImport.requests).toHaveLength(3);

      const exported = exportAsPostmanCollection({
        connectionName: "Acme RT",
        folders: firstImport.folders,
        requests: firstImport.requests,
        variables: firstImport.variables,
      });
      const secondImport = detectAndParseImportFile(exported);

      // Request count and methods preserved
      expect(secondImport.requests).toHaveLength(3);
      const methodsFromFirst = firstImport.requests
        .map((r) => /-X (\w+)/.exec(r.curl)?.[1] ?? "GET")
        .sort();
      const methodsFromSecond = secondImport.requests
        .map((r) => /-X (\w+)/.exec(r.curl)?.[1] ?? "GET")
        .sort();
      expect(methodsFromSecond).toEqual(methodsFromFirst);

      // Folder names preserved (set equality, since order may differ)
      const firstFolders = new Set(firstImport.folders.map((f) => f.name));
      const secondFolders = new Set(secondImport.folders.map((f) => f.name));
      expect(secondFolders).toEqual(firstFolders);
    });
  });

  describe("Postman auth handling — additional branches", () => {
    it("converts bearer auth into Authorization header", () => {
      const collection = {
        info: {
          name: "Bearer",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "B",
            request: {
              method: "GET",
              url: "https://api.example.com/x",
              auth: { type: "bearer", bearer: [{ key: "token", value: "xyz" }] },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("Bearer xyz");
    });

    it("converts basic auth into -u credentials", () => {
      const collection = {
        info: {
          name: "Basic",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "B",
            request: {
              method: "GET",
              url: "https://api.example.com/x",
              auth: {
                type: "basic",
                basic: [
                  { key: "username", value: "alice" },
                  { key: "password", value: "secret" },
                ],
              },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toMatch(/alice/);
    });

    it("converts apikey auth (header location) into custom header", () => {
      const collection = {
        info: {
          name: "ApiKey",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "A",
            request: {
              method: "GET",
              url: "https://api.example.com/x",
              auth: {
                type: "apikey",
                apikey: [
                  { key: "key", value: "X-API-Key" },
                  { key: "value", value: "abc123" },
                  { key: "in", value: "header" },
                ],
              },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("X-API-Key");
      expect(result.requests[0].curl).toContain("abc123");
    });

    it("handles apikey auth with non-header 'in' value by skipping it", () => {
      const collection = {
        info: {
          name: "ApiKeyQuery",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "A",
            request: {
              method: "GET",
              url: "https://api.example.com/x",
              auth: {
                type: "apikey",
                apikey: [
                  { key: "key", value: "X-API-Key" },
                  { key: "value", value: "abc123" },
                  { key: "in", value: "query" },
                ],
              },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).not.toContain("X-API-Key: abc123");
    });

    it("inherits folder-level auth when request lacks its own auth", () => {
      const collection = {
        info: {
          name: "InheritAuth",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "Folder",
            auth: { type: "bearer", bearer: [{ key: "token", value: "inherited-tok" }] },
            item: [
              {
                name: "ChildReq",
                request: { method: "GET", url: "https://api.example.com/c" },
              },
            ],
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("Bearer inherited-tok");
    });
  });

  describe("Postman body modes — additional branches", () => {
    it("converts urlencoded body into form-urlencoded curl", () => {
      const collection = {
        info: {
          name: "URLEnc",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "Form",
            request: {
              method: "POST",
              url: "https://api.example.com/login",
              body: {
                mode: "urlencoded",
                urlencoded: [
                  { key: "username", value: "alice" },
                  { key: "password", value: "se cret" },
                  { key: "disabled_key", value: "x", disabled: true },
                ],
              },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("username=alice");
      expect(result.requests[0].curl).not.toContain("disabled_key");
    });

    it("converts formdata body into form-data curl", () => {
      const collection = {
        info: {
          name: "FormData",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "FD",
            request: {
              method: "POST",
              url: "https://api.example.com/upload",
              body: {
                mode: "formdata",
                formdata: [
                  { key: "file", value: "data" },
                  { key: "skip", value: "x", disabled: true },
                ],
              },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("file=data");
      expect(result.requests[0].curl).not.toContain("skip=x");
    });

    it("auto-detects JSON body when raw starts with { ", () => {
      const collection = {
        info: {
          name: "AutoJSON",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "J",
            request: {
              method: "POST",
              url: "https://api.example.com/data",
              body: { mode: "raw", raw: '   {"k":"v"}' },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("application/json");
    });

    it("respects an explicit Content-Type and does not override it", () => {
      const collection = {
        info: {
          name: "ExplicitCT",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "CT",
            request: {
              method: "POST",
              url: "https://api.example.com/data",
              header: [{ key: "Content-Type", value: "application/vnd.acme+json" }],
              body: { mode: "raw", raw: '{"k":"v"}', options: { raw: { language: "json" } } },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("application/vnd.acme+json");
    });
  });

  describe("Postman URL resolution — additional branches", () => {
    it("resolves URL from host array when raw is missing", () => {
      const collection = {
        info: {
          name: "HostArr",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "H",
            request: {
              method: "GET",
              url: { host: ["api", "example", "com"], path: ["v1", "users"] },
            },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests[0].curl).toContain("api.example.com/v1/users");
    });

    it("handles requests with completely missing url field gracefully", () => {
      const collection = {
        info: {
          name: "NoUrl",
          schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        item: [
          {
            name: "U",
            request: { method: "GET" },
          },
        ],
      };
      const result = detectAndParseImportFile(JSON.stringify(collection));
      expect(result.requests).toHaveLength(1);
    });
  });

  describe("HAR import — additional header/body branches", () => {
    it("skips Host, Content-Length, and pseudo-headers (starting with ':')", () => {
      const har = {
        log: {
          entries: [
            {
              request: {
                method: "GET",
                url: "https://api.example.com/data",
                headers: [
                  { name: "Host", value: "api.example.com" },
                  { name: "Content-Length", value: "0" },
                  { name: ":authority", value: "api.example.com" },
                  { name: "X-Custom", value: "keep" },
                ],
              },
              response: { content: { mimeType: "application/json" } },
            },
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests[0].curl).toContain("X-Custom");
      expect(result.requests[0].curl).not.toContain("Host:");
      expect(result.requests[0].curl).not.toContain("Content-Length");
    });

    it("classifies form-urlencoded body type via postData mimeType", () => {
      const har = {
        log: {
          entries: [
            {
              request: {
                method: "POST",
                url: "https://api.example.com/login",
                headers: [{ name: "Content-Type", value: "application/x-www-form-urlencoded" }],
                postData: {
                  mimeType: "application/x-www-form-urlencoded",
                  text: "a=1&b=2",
                },
              },
              response: { content: { mimeType: "application/json" } },
            },
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].curl).toContain("a=1");
    });

    it("classifies form-data body type via postData mimeType", () => {
      const har = {
        log: {
          entries: [
            {
              request: {
                method: "POST",
                url: "https://api.example.com/upload",
                headers: [{ name: "Content-Type", value: "multipart/form-data; boundary=xyz" }],
                postData: {
                  mimeType: "multipart/form-data; boundary=xyz",
                  text: "file=data",
                },
              },
              response: { content: { mimeType: "application/json" } },
            },
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests).toHaveLength(1);
    });

    it("falls back to 'raw' body type when mimeType is plain text", () => {
      const har = {
        log: {
          entries: [
            {
              request: {
                method: "POST",
                url: "https://api.example.com/x",
                headers: [{ name: "Content-Type", value: "text/plain" }],
                postData: { mimeType: "text/plain", text: "raw text body" },
              },
              response: { content: { mimeType: "application/json" } },
            },
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests[0].curl).toContain("raw text body");
    });

    it("filters HAR entries flagged with static _resourceType like 'stylesheet'", () => {
      const har = {
        log: {
          entries: [
            {
              _resourceType: "stylesheet",
              request: { method: "GET", url: "https://cdn.example.com/style.css", headers: [] },
              response: { content: { mimeType: "text/css" } },
            },
            {
              _resourceType: "xhr",
              request: { method: "GET", url: "https://api.example.com/data", headers: [] },
              response: { content: { mimeType: "application/json" } },
            },
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].curl).toContain("api.example.com/data");
    });

    it("falls back to splitting URL when URL parsing throws (invalid URL)", () => {
      const har = {
        log: {
          entries: [
            {
              request: {
                method: "POST",
                url: "not-a-valid-url?x=1",
                headers: [],
                postData: { mimeType: "application/json", text: '{"a":1}' },
              },
              response: { content: { mimeType: "application/json" } },
            },
          ],
        },
      };
      const result = detectAndParseImportFile(JSON.stringify(har));
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].name).toContain("not-a-valid-url");
    });
  });
});
