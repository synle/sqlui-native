/** Curl command parser — converts between curl strings and RestApiRequest objects. */

import { RestApiMethod, RestApiRequest } from "src/common/adapters/RestApiDataAdapter/types";

/** HTTP methods recognized by the parser. */
const VALID_METHODS: RestApiMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

/**
 * Tokenizes a curl command string respecting quoted strings and backslash-newline continuations.
 * @param input - The raw curl command string.
 * @returns Array of string tokens.
 */
function tokenize(input: string): string[] {
  // Join backslash-newline continuations
  const normalized = input.replace(/\\\s*\n\s*/g, " ").trim();

  const tokens: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];

    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\" && !inSingleQuote) {
      escaped = true;
      continue;
    }

    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if ((ch === " " || ch === "\t") && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parses URL query parameters into a Record.
 * @param url - The URL to extract params from.
 * @returns Record of query parameter key-value pairs.
 */
function extractParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });
  } catch (_err) {
    // URL may contain unresolved variables like {{HOST}}, skip parsing
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
 * Parses a curl command string into a structured RestApiRequest.
 * Handles: -X, -H, -d, --data, --data-raw, -F, -u, -b, -L, -k, URL extraction.
 * @param curlString - The curl command to parse.
 * @returns Parsed request object.
 */
export function parseCurlCommand(curlString: string): RestApiRequest {
  const tokens = tokenize(curlString);

  let method: RestApiMethod | undefined;
  let url = "";
  const headers: Record<string, string> = {};
  let body: string | undefined;
  let cookies: string | undefined;
  let followRedirects = false;
  let insecure = false;
  let auth: { username: string; password: string } | undefined;
  const formParts: string[] = [];

  let i = 0;

  // Skip leading 'curl' token
  if (tokens[0]?.toLowerCase() === "curl") {
    i = 1;
  }

  while (i < tokens.length) {
    const token = tokens[i];

    switch (token) {
      case "-X":
      case "--request": {
        const val = (tokens[++i] || "").toUpperCase() as RestApiMethod;
        if (VALID_METHODS.includes(val)) {
          method = val;
        }
        break;
      }
      case "-H":
      case "--header": {
        const headerVal = tokens[++i] || "";
        const colonIdx = headerVal.indexOf(":");
        if (colonIdx > 0) {
          const key = headerVal.substring(0, colonIdx).trim();
          const value = headerVal.substring(colonIdx + 1).trim();
          headers[key] = value;
        }
        break;
      }
      case "-d":
      case "--data":
      case "--data-raw":
      case "--data-binary":
      case "--data-ascii": {
        body = tokens[++i] || "";
        break;
      }
      case "-F":
      case "--form": {
        formParts.push(tokens[++i] || "");
        break;
      }
      case "-u":
      case "--user": {
        const authVal = tokens[++i] || "";
        const colonIdx = authVal.indexOf(":");
        if (colonIdx > 0) {
          auth = {
            username: authVal.substring(0, colonIdx),
            password: authVal.substring(colonIdx + 1),
          };
        }
        break;
      }
      case "-b":
      case "--cookie": {
        cookies = tokens[++i] || "";
        break;
      }
      case "-L":
      case "--location": {
        followRedirects = true;
        break;
      }
      case "-k":
      case "--insecure": {
        insecure = true;
        break;
      }
      case "-o":
      case "--output":
      case "--connect-timeout":
      case "--max-time":
      case "-A":
      case "--user-agent":
      case "--compressed": {
        // Skip flags with values (except --compressed which has no value)
        if (token !== "--compressed") {
          i++;
        }
        break;
      }
      case "-s":
      case "--silent":
      case "-S":
      case "--show-error":
      case "-v":
      case "--verbose":
      case "-i":
      case "--include": {
        // Boolean flags, skip
        break;
      }
      default: {
        // If it doesn't start with -, treat as URL
        if (!token.startsWith("-") && !url) {
          url = token;
        }
        break;
      }
    }

    i++;
  }

  // Determine body type from form parts
  let bodyType: RestApiRequest["bodyType"] = "none";
  if (formParts.length > 0) {
    bodyType = "form-data";
  } else if (body) {
    const contentType = Object.entries(headers).find(([k]) => k.toLowerCase() === "content-type")?.[1];
    bodyType = detectBodyType(contentType);
  }

  // Default method: POST if body present, GET otherwise
  if (!method) {
    method = body ? "POST" : "GET";
  }

  return {
    method,
    url,
    headers,
    params: extractParams(url),
    body,
    bodyType,
    formParts: formParts.length > 0 ? formParts : undefined,
    cookies,
    followRedirects,
    insecure,
    auth,
  };
}

/**
 * Builds a curl command string from a RestApiRequest.
 * @param request - The structured request to convert.
 * @returns A curl command string.
 */
export function buildCurlCommand(request: RestApiRequest): string {
  const parts: string[] = ["curl"];

  if (request.method !== "GET") {
    parts.push(`-X ${request.method}`);
  }

  parts.push(`'${request.url}'`);

  for (const [key, value] of Object.entries(request.headers)) {
    parts.push(`-H '${key}: ${value}'`);
  }

  if (request.auth) {
    parts.push(`-u '${request.auth.username}:${request.auth.password}'`);
  }

  if (request.cookies) {
    parts.push(`-b '${request.cookies}'`);
  }

  if (request.formParts && request.formParts.length > 0) {
    for (const part of request.formParts) {
      const escaped = part.replace(/'/g, "'\\''");
      parts.push(`-F '${escaped}'`);
    }
  } else if (request.body) {
    const escaped = request.body.replace(/'/g, "'\\''");
    parts.push(`-d '${escaped}'`);
  }

  if (request.followRedirects) {
    parts.push("-L");
  }

  if (request.insecure) {
    parts.push("-k");
  }

  return parts.join(" \\\n  ");
}
