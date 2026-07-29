import { vi, describe, test, expect, beforeEach } from "vitest";

const mockDnsLookup = vi.fn();
vi.mock("dns", () => ({
  default: { lookup: (h: string, cb: any) => mockDnsLookup(h, cb) },
  lookup: (h: string, cb: any) => mockDnsLookup(h, cb),
}));

const mockExecuteCurl = vi.fn();
vi.mock("src/common/adapters/RestApiDataAdapter/curlExecutor", () => ({
  executeCurl: (...args: any[]) => mockExecuteCurl(...args),
}));

const mockExecuteGraphQL = vi.fn();
vi.mock("src/common/adapters/GraphQLDataAdapter/graphqlExecutor", () => ({
  executeGraphQL: (...args: any[]) => mockExecuteGraphQL(...args),
}));

const mockManagedDbStorage = { get: vi.fn() };
vi.mock("src/common/PersistentStorage", () => ({
  getManagedDatabasesStorage: vi.fn(() => Promise.resolve(mockManagedDbStorage)),
}));

import GraphQLDataAdapter from "src/common/adapters/GraphQLDataAdapter/index";

describe("GraphQLDataAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authenticate", () => {
    test("no ENDPOINT — resolves without DNS check", async () => {
      const adapter = new GraphQLDataAdapter("graphql://{}");
      await expect(adapter.authenticate()).resolves.toBeUndefined();
      expect(mockDnsLookup).not.toHaveBeenCalled();
    });

    test("invalid ENDPOINT (no http/https) — throws", async () => {
      const adapter = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "ftp://x.com" })}`,
      );
      await expect(adapter.authenticate()).rejects.toThrow(/Invalid ENDPOINT format/);
    });

    test("malformed ENDPOINT URL — throws", async () => {
      const adapter = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "http://" })}`,
      );
      // The format regex requires at least one character after http(s)://
      await expect(adapter.authenticate()).rejects.toThrow(/Invalid ENDPOINT/);
    });

    test("DNS resolution failure — rejects with hostname", async () => {
      mockDnsLookup.mockImplementation((_h: string, cb: any) => cb(new Error("ENOTFOUND")));
      const adapter = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "https://example.invalid/graphql" })}`,
      );
      await expect(adapter.authenticate()).rejects.toThrow(/Cannot resolve host "example.invalid"/);
    });

    test("DNS resolution success", async () => {
      mockDnsLookup.mockImplementation((_h: string, cb: any) => cb(null));
      const adapter = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "https://api.example.com/graphql" })}`,
      );
      await expect(adapter.authenticate()).resolves.toBeUndefined();
      expect(mockDnsLookup).toHaveBeenCalledWith("api.example.com", expect.any(Function));
    });
  });

  describe("constructor + parsing", () => {
    test("invalid JSON falls back to empty config (no throw)", () => {
      const a = new GraphQLDataAdapter("graphql://not-json{");
      expect(a.dialect).toBe("graphql");
    });
    test("empty body after scheme parses to {}", () => {
      const a = new GraphQLDataAdapter("graphql://");
      expect(a.dialect).toBe("graphql");
    });
  });

  describe("runDiagnostics", () => {
    test("no ENDPOINT — empty array", async () => {
      const a = new GraphQLDataAdapter("graphql://{}");
      await expect(a.runDiagnostics()).resolves.toEqual([]);
    });

    test("successful introspection", async () => {
      mockExecuteCurl.mockResolvedValueOnce({ status: 200, statusText: "OK" });
      const a = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "https://api.example.com/graphql" })}`,
      );
      const out = await a.runDiagnostics();
      expect(out).toEqual([{ name: "Introspection", success: true, message: "200 OK" }]);
    });

    test("curl error — non-fatal, returns failure result", async () => {
      mockExecuteCurl.mockRejectedValueOnce(
        new Error("curl: (6) Could not resolve host: example.invalid"),
      );
      const a = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "https://example.invalid" })}`,
      );
      const out = await a.runDiagnostics();
      expect(out[0]).toMatchObject({ name: "Introspection", success: false });
      expect(out[0].message).toContain("curl: (6)");
    });

    test("non-2xx status — marked unsuccessful", async () => {
      mockExecuteCurl.mockResolvedValueOnce({ status: 500, statusText: "Internal Server Error" });
      const a = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "https://api.example.com" })}`,
      );
      const out = await a.runDiagnostics();
      expect(out[0].success).toBe(false);
    });
  });

  describe("metadata methods", () => {
    const a = new GraphQLDataAdapter("graphql://{}");
    test("getDatabases returns []", async () => {
      await expect(a.getDatabases()).resolves.toEqual([]);
    });
    test("getTables returns []", async () => {
      await expect(a.getTables()).resolves.toEqual([]);
    });
    test("getColumns returns request shape metadata", async () => {
      const cols = await a.getColumns();
      expect(cols.map((c) => c.name)).toEqual(["query", "variables", "operationName", "headers"]);
    });
    test("disconnect is no-op", async () => {
      await expect(a.disconnect()).resolves.toBeUndefined();
    });
  });

  describe("execute", () => {
    test("empty input — returns error result, no execution", async () => {
      const a = new GraphQLDataAdapter("graphql://{}");
      const r = await a.execute("");
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/No query to execute/);
      expect(mockExecuteGraphQL).not.toHaveBeenCalled();
    });

    test("whitespace-only input — same error path", async () => {
      const a = new GraphQLDataAdapter("graphql://{}");
      const r = await a.execute("   \n\t  ");
      expect(r.ok).toBe(false);
    });

    test("no ENDPOINT configured — returns error", async () => {
      const a = new GraphQLDataAdapter("graphql://{}");
      const r = await a.execute("{ __typename }");
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/No ENDPOINT configured/);
    });

    test("happy path — calls executeGraphQL and returns formatted result", async () => {
      mockExecuteGraphQL.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        body: '{"data":{"x":1}}',
        bodyParsed: { data: { x: 1 }, errors: undefined, extensions: { v: 1 } },
        headers: { "content-type": "application/json" },
        timing: 100,
        size: 10,
      });
      const a = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "https://api.example.com/graphql" })}`,
      );
      const r = await a.execute("{ __typename }");
      expect(r.ok).toBe(true);
      expect(r.raw?.[0].data).toEqual({ x: 1 });
      expect(r.meta?.isGraphQL).toBe(true);
      expect(r.meta?.requestEndpoint).toBe("https://api.example.com/graphql");
      expect(mockExecuteGraphQL).toHaveBeenCalledTimes(1);
    });

    test("execute pulls folder vars when connectionId + database provided", async () => {
      mockManagedDbStorage.get.mockResolvedValueOnce({
        props: { variables: [{ key: "TOKEN", value: "secret", enabled: true }] },
      });
      mockExecuteGraphQL.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        body: "{}",
        bodyParsed: { data: {} },
        headers: {},
        timing: 0,
        size: 0,
      });
      const a = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "https://api.example.com" })}`,
      );
      a.connectionId = "conn1";
      const r = await a.execute("{ me }", "folderA");
      expect(r.ok).toBe(true);
      expect(mockManagedDbStorage.get).toHaveBeenCalledWith("folderA");
    });

    test("execute swallows folder var lookup failure (non-fatal)", async () => {
      mockManagedDbStorage.get.mockRejectedValueOnce(new Error("storage down"));
      mockExecuteGraphQL.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        body: "{}",
        bodyParsed: { data: {} },
        headers: {},
        timing: 0,
        size: 0,
      });
      const a = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "https://api.example.com" })}`,
      );
      a.connectionId = "conn1";
      const r = await a.execute("{ x }", "folderA");
      expect(r.ok).toBe(true);
    });

    test("executeGraphQL throw — returns error result with message", async () => {
      mockExecuteGraphQL.mockRejectedValueOnce(new Error("boom"));
      const a = new GraphQLDataAdapter(
        `graphql://${JSON.stringify({ ENDPOINT: "https://api.example.com" })}`,
      );
      const r = await a.execute("{ x }");
      expect(r.ok).toBe(false);
      expect(r.error).toBe("boom");
    });
  });
});
