/** Fetch command parser — converts between fetch() strings and RestApiRequest objects. */

import { RestApiMethod, RestApiRequest } from "src/common/adapters/RestApiDataAdapter/types";

/** HTTP methods recognized by the parser. */
const VALID_METHODS: RestApiMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

/**
 * Extracts URL query parameters into a Record.
 * Duplicate keys (e.g., ?tag=a&tag=b) are joined with ", ".
 * @param url - The URL to extract params from.
 * @returns Record of query parameter key-value pairs.
 */
function extractParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const parsed = new URL(url);
    const seen = new Set<string>();
    parsed.searchParams.forEach((_value, key) => {
      if (!seen.has(key)) {
        seen.add(key);
        const allValues = parsed.searchParams.getAll(key);
        params[key] = allValues.length > 1 ? allValues.join(", ") : allValues[0];
      }
    });
  } catch (_err) {
    // URL may contain unresolved variables, skip parsing
  }
  return params;
}

/**
 * Detects the body content type from a content-type header value.
 * @param contentType - The Content-Type header value.
 * @returns The body type hint.
 */
function detectBodyType(contentType?: string): RestApiRequest["bodyType"] {
  if (!contentType) {
    return "raw";
  }
  const lower = contentType.toLowerCase();
  if (lower.includes("application/json")) {
    return "json";
  }
  if (lower.includes("application/x-www-form-urlencoded")) {
    return "form-urlencoded";
  }
  if (lower.includes("multipart/form-data")) {
    return "form-data";
  }
  return "raw";
}

/**
 * Parses a Chrome DevTools-style fetch() command into a RestApiRequest.
 * Handles the format: fetch("url", { headers: {...}, body: ..., method: "..." })
 * @param fetchString - The fetch() command string.
 * @returns Parsed request object.
 */
export function parseFetchCommand(fetchString: string): RestApiRequest {
  const headers: Record<string, string> = {};
  let method: RestApiMethod = "GET";
  let url = "";
  let body: string | undefined;
  let cookies: string | undefined;

  // Extract URL from fetch("url", ...) or fetch('url', ...)
  const urlMatch = fetchString.match(/fetch\s*\(\s*["']([^"']+)["']/);
  if (urlMatch) {
    url = urlMatch[1];
  }

  // Extract the options object (second argument to fetch)
  const optionsMatch = fetchString.match(/fetch\s*\(\s*["'][^"']+["']\s*,\s*(\{[\s\S]*\})\s*\)/);
  if (optionsMatch) {
    try {
      // Clean up the JS object to be valid JSON:
      // - Replace single quotes with double quotes (but carefully)
      // - Handle trailing commas
      let optionsStr = optionsMatch[1];

      // Try parsing as-is first (Chrome DevTools uses valid JSON with double quotes)
      let options: any;
      try {
        options = JSON.parse(optionsStr);
      } catch (_err) {
        // Fallback: clean up JS-style object notation
        optionsStr = optionsStr
          .replace(/'/g, '"') // Single to double quotes
          .replace(/,\s*}/g, "}") // Remove trailing commas before }
          .replace(/,\s*]/g, "]") // Remove trailing commas before ]
          .replace(/(\w+)\s*:/g, '"$1":'); // Unquoted keys to quoted
        options = JSON.parse(optionsStr);
      }

      // Extract method
      if (options.method && VALID_METHODS.includes(options.method.toUpperCase())) {
        method = options.method.toUpperCase() as RestApiMethod;
      }

      // Extract headers
      if (options.headers && typeof options.headers === "object") {
        for (const [key, value] of Object.entries(options.headers)) {
          if (typeof value === "string") {
            headers[key] = value;
          }
        }
      }

      // Extract body
      if (options.body !== undefined && options.body !== null) {
        body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      }

      // Extract referrer as a header if present
      if (options.referrer) {
        headers["Referer"] = options.referrer;
      }
    } catch (_err) {
      // If JSON parsing fails entirely, we still have the URL
    }
  }

  // Detect body type from content-type header
  const contentType = Object.entries(headers).find(([k]) => k.toLowerCase() === "content-type")?.[1];
  const bodyType = body ? detectBodyType(contentType) : ("none" as const);

  return {
    method,
    url,
    headers,
    params: extractParams(url),
    body,
    bodyType,
    cookies,
    followRedirects: false,
    insecure: false,
  };
}

/**
 * Builds a Chrome DevTools-style fetch() string from a RestApiRequest.
 * @param request - The structured request to convert.
 * @returns A fetch() command string.
 */
export function buildFetchCommand(request: RestApiRequest): string {
  const options: Record<string, any> = {};

  if (Object.keys(request.headers).length > 0) {
    options.headers = request.headers;
  }

  if (request.body !== undefined) {
    options.body = request.body;
  }

  options.method = request.method;

  const optionsStr = JSON.stringify(options, null, 2);

  return `fetch("${request.url}", ${optionsStr});`;
}
