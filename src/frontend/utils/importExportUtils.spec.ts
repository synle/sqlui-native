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
      const methodsFromFirst = firstImport.requests.map((r) => /-X (\w+)/.exec(r.curl)?.[1] ?? "GET").sort();
      const methodsFromSecond = secondImport.requests.map((r) => /-X (\w+)/.exec(r.curl)?.[1] ?? "GET").sort();
      expect(methodsFromSecond).toEqual(methodsFromFirst);

      // Folder names preserved (set equality, since order may differ)
      const firstFolders = new Set(firstImport.folders.map((f) => f.name));
      const secondFolders = new Set(secondImport.folders.map((f) => f.name));
      expect(secondFolders).toEqual(firstFolders);
    });
  });
});
