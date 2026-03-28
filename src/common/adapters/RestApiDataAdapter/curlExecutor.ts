/** Curl executor — runs HTTP requests via child_process curl with timing metrics. */

import { execFile } from "child_process";
import { RestApiRequest, RestApiResponse, RestApiTiming } from "src/common/adapters/RestApiDataAdapter/types";

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30000;

/** Separator used to split timing JSON from response output. */
const TIMING_SEPARATOR = "\n__SQLUI_TIMING__\n";

/** Curl --write-out format for capturing timing metrics. */
const WRITE_OUT_FORMAT = [
  `"timeTotal":%{time_total}`,
  `"timeDns":%{time_namelookup}`,
  `"timeConnect":%{time_connect}`,
  `"timeTls":%{time_appconnect}`,
  `"timeTtfb":%{time_starttransfer}`,
  `"httpCode":%{http_code}`,
  `"sizeDownload":%{size_download}`,
].join(",");

/**
 * Parses raw response headers from curl -i output.
 * @param headerBlock - The raw header text block.
 * @returns Parsed status line info and headers map.
 */
function parseResponseHeaders(headerBlock: string): {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
} {
  const lines = headerBlock.split(/\r?\n/);
  let status = 0;
  let statusText = "";
  const headers: Record<string, string> = {};
  const cookies: Record<string, string> = {};

  for (const line of lines) {
    // Status line: HTTP/1.1 200 OK
    const statusMatch = line.match(/^HTTP\/[\d.]+\s+(\d+)\s*(.*)/);
    if (statusMatch) {
      status = parseInt(statusMatch[1], 10);
      statusText = statusMatch[2].trim();
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim();
      const value = line.substring(colonIdx + 1).trim();
      headers[key] = value;

      // Parse Set-Cookie headers
      if (key.toLowerCase() === "set-cookie") {
        const cookieMatch = value.match(/^([^=]+)=([^;]*)/);
        if (cookieMatch) {
          cookies[cookieMatch[1].trim()] = cookieMatch[2].trim();
        }
      }
    }
  }

  return { status, statusText, headers, cookies };
}

/**
 * Builds curl command-line arguments from a RestApiRequest.
 * @param request - The parsed request to execute.
 * @returns Array of curl arguments.
 */
function buildCurlArgs(request: RestApiRequest): string[] {
  const args: string[] = [
    "-s", // Silent (no progress bar)
    "-S", // Show errors
    "-w",
    `${TIMING_SEPARATOR}{${WRITE_OUT_FORMAT}}`, // Timing output
  ];

  // Method — use -I for HEAD (implies header output), -i for all others
  if (request.method === "HEAD") {
    args.push("-I");
  } else {
    args.push("-i"); // Include response headers in output
    if (request.method !== "GET") {
      args.push("-X", request.method);
    }
  }

  // Headers
  for (const [key, value] of Object.entries(request.headers)) {
    args.push("-H", `${key}: ${value}`);
  }

  // Basic auth
  if (request.auth) {
    args.push("-u", `${request.auth.username}:${request.auth.password}`);
  }

  // Cookies
  if (request.cookies) {
    args.push("-b", request.cookies);
  }

  // Body
  if (request.body) {
    args.push("--data-raw", request.body);
  }

  // Follow redirects
  if (request.followRedirects) {
    args.push("-L");
  }

  // Skip SSL verification
  if (request.insecure) {
    args.push("-k");
  }

  // URL (must be last)
  args.push(request.url);

  return args;
}

/**
 * Executes an HTTP request using the system curl binary.
 * @param request - The structured request to execute.
 * @param timeoutMs - Request timeout in milliseconds.
 * @returns Structured response with headers, body, timing, and cookies.
 */
export function executeCurl(request: RestApiRequest, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<RestApiResponse> {
  return new Promise((resolve, reject) => {
    const args = buildCurlArgs(request);

    execFile("curl", args, { timeout: timeoutMs, maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        if (error.killed) {
          reject(new Error(`Request timed out after ${timeoutMs}ms`));
        } else {
          // Prefer stderr (contains "curl: (N) ..." messages), fall back to a short error
          const curlError = stderr?.trim() || error.message?.split("\n")[0] || "Unknown error";
          reject(new Error(curlError));
        }
        return;
      }

      try {
        // Split output into response (headers + body) and timing JSON
        const timingIdx = stdout.lastIndexOf(TIMING_SEPARATOR);
        let responsePart = stdout;
        let timingJson = "{}";

        if (timingIdx >= 0) {
          responsePart = stdout.substring(0, timingIdx);
          timingJson = stdout.substring(timingIdx + TIMING_SEPARATOR.length);
        }

        // Split headers from body (double CRLF or double LF)
        // Handle multiple header blocks (e.g., 100 Continue, redirects)
        let headerBlock = "";
        let body = responsePart;

        const headerEndPatterns = ["\r\n\r\n", "\n\n"];
        let lastHeaderEnd = -1;

        for (const pattern of headerEndPatterns) {
          let searchFrom = 0;
          let idx: number;
          while ((idx = responsePart.indexOf(pattern, searchFrom)) !== -1) {
            // Check if the next part starts with HTTP/ (another header block from redirect)
            const afterHeaders = responsePart.substring(idx + pattern.length);
            if (afterHeaders.startsWith("HTTP/")) {
              searchFrom = idx + pattern.length;
              continue;
            }
            lastHeaderEnd = idx;
            headerBlock = responsePart.substring(0, idx);
            body = afterHeaders;
            break;
          }
          if (lastHeaderEnd >= 0) {
            break;
          }
        }

        // If no split found, treat entire response as body
        if (lastHeaderEnd < 0) {
          body = responsePart;
        }

        // Parse headers
        const { status, statusText, headers, cookies } = parseResponseHeaders(headerBlock);

        // Parse timing
        let timing: RestApiTiming = { total: 0 };
        try {
          const timingData = JSON.parse(timingJson);
          timing = {
            total: Math.round((timingData.timeTotal || 0) * 1000),
            dns: Math.round((timingData.timeDns || 0) * 1000),
            connect: Math.round((timingData.timeConnect || 0) * 1000),
            tls: Math.round((timingData.timeTls || 0) * 1000),
            ttfb: Math.round((timingData.timeTtfb || 0) * 1000),
          };
        } catch (_err) {
          // Timing parse failure is non-fatal
        }

        // Try to parse body as JSON
        let bodyParsed: any;
        try {
          bodyParsed = JSON.parse(body);
        } catch (_err) {
          // Not JSON, leave as string
        }

        const size = Buffer.byteLength(body, "utf-8");

        resolve({
          status: status || (error ? 0 : 200),
          statusText: statusText || (error ? "Error" : "OK"),
          headers,
          body,
          bodyParsed,
          timing,
          cookies,
          size,
        });
      } catch (parseErr) {
        console.error("curlExecutor:executeCurl", parseErr);
        reject(new Error(`Failed to parse curl response: ${parseErr}`));
      }
    });
  });
}
