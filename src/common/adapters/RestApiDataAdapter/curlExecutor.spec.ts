import { describe, it, expect, vi, beforeEach } from "vitest";
import { execFile } from "node:child_process";
import { executeCurl } from "src/common/adapters/RestApiDataAdapter/curlExecutor";
import { RestApiRequest } from "src/common/adapters/RestApiDataAdapter/types";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

const mockExecFile = execFile as unknown as ReturnType<typeof vi.fn>;

const TIMING_SEPARATOR = "\n__SQLUI_TIMING__\n";

function makeTimingJson(overrides: Record<string, number> = {}): string {
  const defaults = {
    timeTotal: 0.123,
    timeDns: 0.01,
    timeConnect: 0.02,
    timeTls: 0.03,
    timeTtfb: 0.05,
    httpCode: 200,
    sizeDownload: 42,
  };
  return JSON.stringify({ ...defaults, ...overrides });
}

function buildStdout(headers: string, body: string, timingJson?: string): string {
  return `${headers}\r\n\r\n${body}${TIMING_SEPARATOR}${timingJson ?? makeTimingJson()}`;
}

function makeRequest(overrides: Partial<RestApiRequest> = {}): RestApiRequest {
  return {
    method: "GET",
    url: "https://example.com/api",
    headers: {},
    params: {},
    ...overrides,
  };
}

function simulateCurl(stdout: string, stderr = "", error: (Error & { killed?: boolean }) | null = null) {
  mockExecFile.mockImplementation((_cmd: string, _args: string[], _opts: any, cb: Function) => {
    cb(error, stdout, stderr);
  });
}

describe("executeCurl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful responses", () => {
    it("should parse a simple GET 200 with JSON body", async () => {
      const jsonBody = JSON.stringify({ message: "hello" });
      const stdout = buildStdout("HTTP/1.1 200 OK\r\nContent-Type: application/json", jsonBody);
      simulateCurl(stdout);

      const result = await executeCurl(makeRequest());

      expect(result.status).toBe(200);
      expect(result.statusText).toBe("OK");
      expect(result.headers["Content-Type"]).toBe("application/json");
      expect(result.body).toBe(jsonBody);
      expect(result.bodyParsed).toEqual({ message: "hello" });
      expect(result.timing.total).toBe(123);
      expect(result.timing.dns).toBe(10);
      expect(result.timing.connect).toBe(20);
      expect(result.timing.tls).toBe(30);
      expect(result.timing.ttfb).toBe(50);
      expect(result.size).toBe(Buffer.byteLength(jsonBody, "utf-8"));
    });

    it("should leave bodyParsed undefined for non-JSON body", async () => {
      const htmlBody = "<html><body>Hello</body></html>";
      const stdout = buildStdout("HTTP/1.1 200 OK\r\nContent-Type: text/html", htmlBody);
      simulateCurl(stdout);

      const result = await executeCurl(makeRequest());

      expect(result.body).toBe(htmlBody);
      expect(result.bodyParsed).toBeUndefined();
    });

    it("should parse Set-Cookie headers into cookies map", async () => {
      const headers = "HTTP/1.1 200 OK\r\nSet-Cookie: session=abc123; Path=/; HttpOnly\r\nContent-Type: text/plain";
      const stdout = buildStdout(headers, "ok");
      simulateCurl(stdout);

      const result = await executeCurl(makeRequest());

      expect(result.cookies).toEqual({ session: "abc123" });
    });

    it("should handle multiple header blocks (100 Continue then 200 OK)", async () => {
      const responsePart = "HTTP/1.1 100 Continue\r\n\r\n" + "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n" + '{"data":true}';
      const stdout = `${responsePart}${TIMING_SEPARATOR}${makeTimingJson()}`;
      simulateCurl(stdout);

      const result = await executeCurl(makeRequest());

      expect(result.status).toBe(200);
      expect(result.statusText).toBe("OK");
      expect(result.bodyParsed).toEqual({ data: true });
    });

    it("should resolve when curl error occurs but stdout is present", async () => {
      const stdout = buildStdout("HTTP/1.1 503 Service Unavailable\r\nContent-Type: text/plain", "server down");
      const error = new Error("curl failed") as Error & { killed?: boolean };
      error.killed = false;
      simulateCurl(stdout, "", error);

      const result = await executeCurl(makeRequest());

      expect(result.status).toBe(503);
      expect(result.statusText).toBe("Service Unavailable");
      expect(result.body).toBe("server down");
    });
  });

  describe("buildCurlArgs via execFile arguments", () => {
    function getCurlArgs(): string[] {
      return mockExecFile.mock.calls[0][1];
    }

    it("should include -X POST and --data-raw for POST with body", async () => {
      const body = JSON.stringify({ key: "value" });
      const stdout = buildStdout("HTTP/1.1 201 Created", "");
      simulateCurl(stdout);

      await executeCurl(makeRequest({ method: "POST", body }));

      const args = getCurlArgs();
      expect(args).toContain("-X");
      expect(args[args.indexOf("-X") + 1]).toBe("POST");
      expect(args).toContain("--data-raw");
      expect(args[args.indexOf("--data-raw") + 1]).toBe(body);
    });

    it("should not include -X for GET requests", async () => {
      const stdout = buildStdout("HTTP/1.1 200 OK", "");
      simulateCurl(stdout);

      await executeCurl(makeRequest({ method: "GET" }));

      const args = getCurlArgs();
      expect(args).not.toContain("-X");
      expect(args).toContain("-i");
    });

    it("should include -u flag for auth", async () => {
      const stdout = buildStdout("HTTP/1.1 200 OK", "");
      simulateCurl(stdout);

      await executeCurl(makeRequest({ auth: { username: "user", password: "pass" } }));

      const args = getCurlArgs();
      expect(args).toContain("-u");
      expect(args[args.indexOf("-u") + 1]).toBe("user:pass");
    });

    it("should include -b flag for cookies", async () => {
      const stdout = buildStdout("HTTP/1.1 200 OK", "");
      simulateCurl(stdout);

      await executeCurl(makeRequest({ cookies: "session=xyz" }));

      const args = getCurlArgs();
      expect(args).toContain("-b");
      expect(args[args.indexOf("-b") + 1]).toBe("session=xyz");
    });

    it("should include -F flags for formParts", async () => {
      const stdout = buildStdout("HTTP/1.1 200 OK", "");
      simulateCurl(stdout);

      await executeCurl(makeRequest({ formParts: ["file=@/tmp/test.txt", "name=hello"] }));

      const args = getCurlArgs();
      const fIndices = args.reduce<number[]>((acc, val, idx) => (val === "-F" ? [...acc, idx] : acc), []);
      expect(fIndices).toHaveLength(2);
      expect(args[fIndices[0] + 1]).toBe("file=@/tmp/test.txt");
      expect(args[fIndices[1] + 1]).toBe("name=hello");
      // formParts should take precedence over body
      expect(args).not.toContain("--data-raw");
    });

    it("should include -L for followRedirects", async () => {
      const stdout = buildStdout("HTTP/1.1 200 OK", "");
      simulateCurl(stdout);

      await executeCurl(makeRequest({ followRedirects: true }));

      expect(getCurlArgs()).toContain("-L");
    });

    it("should include -k for insecure", async () => {
      const stdout = buildStdout("HTTP/1.1 200 OK", "");
      simulateCurl(stdout);

      await executeCurl(makeRequest({ insecure: true }));

      expect(getCurlArgs()).toContain("-k");
    });

    it("should use -I instead of -i for HEAD method", async () => {
      const stdout = buildStdout("HTTP/1.1 200 OK", "");
      simulateCurl(stdout);

      await executeCurl(makeRequest({ method: "HEAD" }));

      const args = getCurlArgs();
      expect(args).toContain("-I");
      expect(args).not.toContain("-i");
    });

    it("should include custom headers with -H", async () => {
      const stdout = buildStdout("HTTP/1.1 200 OK", "");
      simulateCurl(stdout);

      await executeCurl(makeRequest({ headers: { Authorization: "Bearer token123", Accept: "application/json" } }));

      const args = getCurlArgs();
      const hIndices = args.reduce<number[]>((acc, val, idx) => (val === "-H" ? [...acc, idx] : acc), []);
      expect(hIndices).toHaveLength(2);
      expect(args[hIndices[0] + 1]).toBe("Authorization: Bearer token123");
      expect(args[hIndices[1] + 1]).toBe("Accept: application/json");
    });

    it("should place the URL as the last argument", async () => {
      const stdout = buildStdout("HTTP/1.1 200 OK", "");
      simulateCurl(stdout);

      await executeCurl(makeRequest({ url: "https://example.com/test" }));

      const args = getCurlArgs();
      expect(args[args.length - 1]).toBe("https://example.com/test");
    });
  });

  describe("timing parsing", () => {
    it("should parse timing metrics from curl write-out", async () => {
      const timingJson = makeTimingJson({
        timeTotal: 0.456,
        timeDns: 0.012,
        timeConnect: 0.034,
        timeTls: 0.078,
        timeTtfb: 0.123,
      });
      const stdout = buildStdout("HTTP/1.1 200 OK", "body", timingJson);
      simulateCurl(stdout);

      const result = await executeCurl(makeRequest());

      expect(result.timing).toEqual({
        total: 456,
        dns: 12,
        connect: 34,
        tls: 78,
        ttfb: 123,
      });
    });

    it("should default to zero timing on invalid timing JSON", async () => {
      const stdout = `HTTP/1.1 200 OK\r\n\r\nbody${TIMING_SEPARATOR}not-json`;
      simulateCurl(stdout);

      const result = await executeCurl(makeRequest());

      expect(result.timing).toEqual({ total: 0 });
    });
  });

  describe("error handling", () => {
    it("should reject with timeout message when error.killed is true", async () => {
      const error = new Error("killed") as Error & { killed?: boolean };
      error.killed = true;
      simulateCurl("", "", error);

      await expect(executeCurl(makeRequest(), 5000)).rejects.toThrow("Request timed out after 5000ms");
    });

    it("should reject with stderr message on curl failure without stdout", async () => {
      const error = new Error("exit code 6") as Error & { killed?: boolean };
      error.killed = false;
      simulateCurl("", "curl: (6) Could not resolve host: bad.example.com", error);

      await expect(executeCurl(makeRequest())).rejects.toThrow("curl: (6) Could not resolve host: bad.example.com");
    });

    it("should fall back to error.message when stderr is empty", async () => {
      const error = new Error("Command failed: curl") as Error & { killed?: boolean };
      error.killed = false;
      simulateCurl("", "", error);

      await expect(executeCurl(makeRequest())).rejects.toThrow("Command failed: curl");
    });
  });
});
