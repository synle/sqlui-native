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

const mockManagedDbStorage = { get: vi.fn() };
vi.mock("src/common/PersistentStorage", () => ({
  getManagedDatabasesStorage: vi.fn(() => Promise.resolve(mockManagedDbStorage)),
}));

import RestApiDataAdapter from "src/common/adapters/RestApiDataAdapter/index";

describe("RestApiDataAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor parses legacy and modern schemes", () => {
    test("rest:// scheme", () => {
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "https://api.example.com" })}`);
      expect(a.dialect).toBe("rest");
    });
    test("restapi:// scheme is also recognized", () => {
      const a = new RestApiDataAdapter(`restapi://${JSON.stringify({ HOST: "https://api.example.com" })}`);
      expect(a.dialect).toBe("rest");
    });
    test("invalid JSON falls back to empty config (no throw)", () => {
      const a = new RestApiDataAdapter("rest://garbage{");
      expect(a.dialect).toBe("rest");
    });
    test("empty body after scheme parses to {}", () => {
      const a = new RestApiDataAdapter("rest://");
      expect(a.dialect).toBe("rest");
    });
  });

  describe("authenticate", () => {
    test("no HOST — resolves", async () => {
      const a = new RestApiDataAdapter("rest://{}");
      await expect(a.authenticate()).resolves.toBeUndefined();
      expect(mockDnsLookup).not.toHaveBeenCalled();
    });
    test("invalid HOST format — throws", async () => {
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "ftp://x" })}`);
      await expect(a.authenticate()).rejects.toThrow(/Invalid HOST format/);
    });
    test("DNS lookup error — throws Cannot resolve host", async () => {
      mockDnsLookup.mockImplementation((_h: string, cb: any) => cb(new Error("ENOTFOUND")));
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "https://example.invalid" })}`);
      await expect(a.authenticate()).rejects.toThrow(/Cannot resolve host "example.invalid"/);
    });
    test("DNS lookup success", async () => {
      mockDnsLookup.mockImplementation((_h: string, cb: any) => cb(null));
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "https://api.example.com" })}`);
      await expect(a.authenticate()).resolves.toBeUndefined();
    });
  });

  describe("runDiagnostics", () => {
    test("no HOST — empty array", async () => {
      const a = new RestApiDataAdapter("rest://{}");
      await expect(a.runDiagnostics()).resolves.toEqual([]);
    });

    test("runs HEAD/GET/OPTIONS in order, success when 2xx-4xx", async () => {
      mockExecuteCurl
        .mockResolvedValueOnce({ status: 200, statusText: "OK" })
        .mockResolvedValueOnce({ status: 404, statusText: "Not Found" })
        .mockResolvedValueOnce({ status: 0, statusText: "" }); // fails ok check
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "https://api.example.com" })}`);
      const out = await a.runDiagnostics();
      expect(out.map((r) => r.name)).toEqual(["HEAD", "GET", "OPTIONS"]);
      expect(out[0].success).toBe(true); // 200
      expect(out[1].success).toBe(true); // 404 still < 500
      expect(out[2].success).toBe(false); // status 0
    });

    test("curl rejection — captured as failure with curl error text", async () => {
      mockExecuteCurl.mockRejectedValue(new Error("curl: (6) Could not resolve host"));
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "https://example.invalid" })}`);
      const out = await a.runDiagnostics();
      expect(out.every((r) => !r.success)).toBe(true);
      expect(out[0].message).toContain("curl: (6)");
    });
  });

  describe("metadata methods", () => {
    const a = new RestApiDataAdapter("rest://{}");
    test("getDatabases returns []", async () => {
      await expect(a.getDatabases()).resolves.toEqual([]);
    });
    test("getTables returns []", async () => {
      await expect(a.getTables()).resolves.toEqual([]);
    });
    test("getColumns returns request shape", async () => {
      const c = await a.getColumns();
      expect(c.map((x) => x.name)).toEqual(["method", "url", "headers", "params", "body", "bodyType"]);
    });
    test("disconnect is no-op", async () => {
      await expect(a.disconnect()).resolves.toBeUndefined();
    });
  });

  describe("execute", () => {
    test("empty input — error result", async () => {
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "https://api.example.com" })}`);
      const r = await a.execute("   ");
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/No request to execute/);
    });

    test("happy path — calls executeCurl and shapes result", async () => {
      mockExecuteCurl.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        body: '{"x":1}',
        bodyParsed: { x: 1 },
        headers: { "content-type": "application/json" },
        cookies: [],
        timing: 50,
        size: 7,
      });
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "https://api.example.com" })}`);
      const r = await a.execute(`curl 'https://api.example.com/foo'`);
      expect(r.ok).toBe(true);
      expect(r.raw?.[0].status).toBe(200);
      expect(r.meta?.isRestApi).toBe(true);
      expect(r.meta?.requestUrl).toContain("https://api.example.com/foo");
    });

    test("missing URL — returns error", async () => {
      const a = new RestApiDataAdapter("rest://{}");
      // command with no url discoverable
      const r = await a.execute("not a curl");
      expect(r.ok).toBe(false);
    });

    test("execute resolves folder variables when connectionId + database set", async () => {
      mockManagedDbStorage.get.mockResolvedValueOnce({
        props: { variables: [{ key: "TOKEN", value: "secret", enabled: true }] },
      });
      mockExecuteCurl.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        body: "{}",
        bodyParsed: {},
        headers: {},
        cookies: [],
        timing: 0,
        size: 0,
      });
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "https://api.example.com" })}`);
      a.connectionId = "conn1";
      const r = await a.execute("curl 'https://api.example.com/me'", "folderA");
      expect(r.ok).toBe(true);
      expect(mockManagedDbStorage.get).toHaveBeenCalledWith("folderA");
    });

    test("execute swallows folder var lookup error", async () => {
      mockManagedDbStorage.get.mockRejectedValueOnce(new Error("down"));
      mockExecuteCurl.mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        body: "{}",
        bodyParsed: {},
        headers: {},
        cookies: [],
        timing: 0,
        size: 0,
      });
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "https://api.example.com" })}`);
      a.connectionId = "conn1";
      const r = await a.execute("curl 'https://api.example.com/x'", "fA");
      expect(r.ok).toBe(true);
    });

    test("executeCurl throwing returns error result", async () => {
      mockExecuteCurl.mockRejectedValueOnce(new Error("network"));
      const a = new RestApiDataAdapter(`rest://${JSON.stringify({ HOST: "https://api.example.com" })}`);
      const r = await a.execute("curl 'https://api.example.com/x'");
      expect(r.ok).toBe(false);
      expect(r.error).toBe("network");
    });
  });
});
