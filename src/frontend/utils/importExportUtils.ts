/** Utilities for importing HAR / Postman collections and exporting as Postman JSON. */

import { buildCurlCommand } from "src/common/adapters/RestApiDataAdapter/curlParser";
import { parseCurlCommand } from "src/common/adapters/RestApiDataAdapter/curlParser";
import type { HarEntry, HarLog, RestApiRequest } from "src/common/adapters/RestApiDataAdapter/types";

// =========================================================================
// Types
// =========================================================================

/** A parsed folder from an imported collection. */
export type ImportedFolder = {
  /** Folder display name. */
  name: string;
  /** Optional folder-level variables. */
  variables?: { key: string; value: string; enabled: boolean }[];
};

/** A parsed request from an imported collection. */
export type ImportedRequest = {
  /** Request display name. */
  name: string;
  /** Parent folder name. */
  folderName: string;
  /** The curl command representing this request. */
  curl: string;
};

/** Result of detecting and parsing an import file. */
export type ImportDetectionResult = {
  /** Detected format: "har" or "postman". */
  format: "har" | "postman";
  /** Human-readable summary for confirmation dialog. */
  summary: string;
  /** Parsed folders to import. */
  folders: ImportedFolder[];
  /** Parsed requests to import. */
  requests: ImportedRequest[];
  /** Collection-level variables (from Postman). */
  variables?: { key: string; value: string; enabled: boolean }[];
};

/** Postman Collection v2.1 types. */
type PostmanVariable = { key: string; value: string; type?: string };
type PostmanHeader = { key: string; value: string; disabled?: boolean };
type PostmanUrlParam = { key: string; value: string; disabled?: boolean };
type PostmanUrl = { raw?: string; host?: string[]; path?: string[]; query?: PostmanUrlParam[] } | string;
type PostmanAuth = {
  type: string;
  bearer?: { key: string; value: string }[];
  basic?: { key: string; value: string }[];
  apikey?: { key: string; value: string }[];
};
type PostmanBody = {
  mode?: string;
  raw?: string;
  urlencoded?: { key: string; value: string; disabled?: boolean }[];
  formdata?: { key: string; value: string; disabled?: boolean; type?: string }[];
  options?: { raw?: { language?: string } };
};
type PostmanRequest = {
  method?: string;
  url?: PostmanUrl;
  header?: PostmanHeader[];
  body?: PostmanBody;
  auth?: PostmanAuth;
};
type PostmanItem = {
  name?: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
  auth?: PostmanAuth;
  variable?: PostmanVariable[];
};
type PostmanCollection = {
  info?: { name?: string; schema?: string };
  item?: PostmanItem[];
  variable?: PostmanVariable[];
  auth?: PostmanAuth;
};

// =========================================================================
// Format detection
// =========================================================================

/**
 * Detects whether the JSON string is a HAR file or a Postman Collection and parses it.
 * @param jsonString - Raw JSON string from the uploaded file.
 * @returns Parsed import result with format, summary, folders, and requests.
 * @throws Error if the format is not recognized.
 */
export function detectAndParseImportFile(jsonString: string): ImportDetectionResult {
  const parsed = JSON.parse(jsonString);

  if (parsed?.log?.entries) {
    return parseHarFile(parsed);
  }

  if (parsed?.info?.schema?.includes("getpostman.com") || parsed?.item) {
    return parsePostmanCollection(parsed);
  }

  throw new Error("Unsupported file format. Please provide a HAR or Postman Collection JSON file.");
}

// =========================================================================
// HAR import
// =========================================================================

/** MIME types for static assets that should be filtered out. */
const STATIC_ASSET_MIME_PATTERNS = [
  "image/",
  "font/",
  "text/css",
  "text/html",
  "application/javascript",
  "text/javascript",
  "application/x-javascript",
  "video/",
  "audio/",
];

/** Resource types from HAR `_resourceType` that indicate static assets. */
const STATIC_RESOURCE_TYPES = ["stylesheet", "image", "font", "script", "media", "manifest", "other"];

/**
 * Checks if a HAR entry is a static asset (not an API call).
 * @param entry - The HAR entry to check.
 * @returns True if the entry should be filtered out.
 */
function isStaticAsset(entry: HarEntry): boolean {
  const resourceType = (entry as any)._resourceType;
  if (resourceType && STATIC_RESOURCE_TYPES.includes(resourceType)) {
    return true;
  }

  const responseMime = entry.response?.content?.mimeType || "";
  return STATIC_ASSET_MIME_PATTERNS.some((pattern) => responseMime.startsWith(pattern));
}

/**
 * Builds a dedup key for a HAR entry: method + URL path (no query) + body for mutating methods.
 * @param entry - The HAR entry.
 * @returns A string key for deduplication.
 */
function buildDedupKey(entry: HarEntry): string {
  const method = entry.request.method.toUpperCase();
  let urlPath: string;
  try {
    const parsed = new URL(entry.request.url);
    urlPath = parsed.origin + parsed.pathname;
  } catch {
    urlPath = entry.request.url.split("?")[0];
  }

  const mutatingMethods = ["POST", "PUT", "PATCH"];
  const body = mutatingMethods.includes(method) ? entry.request.postData?.text || "" : "";

  return `${method}|${urlPath}|${body}`;
}

/**
 * Converts a HAR entry to a curl command string.
 * @param entry - The HAR entry to convert.
 * @returns A curl command string.
 */
function harEntryToCurl(entry: HarEntry): string {
  const req = entry.request;
  const request: RestApiRequest = {
    method: req.method.toUpperCase() as RestApiRequest["method"],
    url: req.url,
    headers: {},
    params: {},
  };

  for (const h of req.headers || []) {
    const lowerName = h.name.toLowerCase();
    if (lowerName === "host" || lowerName === "content-length" || lowerName.startsWith(":")) {
      continue;
    }
    request.headers[h.name] = h.value;
  }

  if (req.postData?.text) {
    request.body = req.postData.text;
    const contentType = req.postData.mimeType || "";
    if (contentType.includes("json")) {
      request.bodyType = "json";
    } else if (contentType.includes("form-urlencoded")) {
      request.bodyType = "form-urlencoded";
    } else if (contentType.includes("form-data")) {
      request.bodyType = "form-data";
    } else {
      request.bodyType = "raw";
    }
  }

  return buildCurlCommand(request);
}

/**
 * Generates a short name for a HAR entry based on method and URL path.
 * @param entry - The HAR entry.
 * @returns A display name like "GET /api/users".
 */
function harEntryName(entry: HarEntry): string {
  const method = entry.request.method.toUpperCase();
  try {
    const parsed = new URL(entry.request.url);
    return `${method} ${parsed.pathname}`;
  } catch {
    return `${method} ${entry.request.url}`;
  }
}

/**
 * Parses a HAR file, filtering static assets and deduplicating.
 * @param har - The parsed HAR JSON object.
 * @returns ImportDetectionResult with format "har".
 */
function parseHarFile(har: { log: HarLog }): ImportDetectionResult {
  const entries = har.log.entries || [];

  const apiEntries = entries.filter((entry) => !isStaticAsset(entry));

  const seen = new Set<string>();
  const dedupedEntries: HarEntry[] = [];
  for (const entry of apiEntries) {
    const key = buildDedupKey(entry);
    if (!seen.has(key)) {
      seen.add(key);
      dedupedEntries.push(entry);
    }
  }

  const folderName = "HAR Import";
  const requests: ImportedRequest[] = dedupedEntries.map((entry) => ({
    name: harEntryName(entry),
    folderName,
    curl: harEntryToCurl(entry),
  }));

  const totalFiltered = entries.length - apiEntries.length;
  const totalDeduped = apiEntries.length - dedupedEntries.length;
  let summary = `Detected HAR file with ${dedupedEntries.length} request${dedupedEntries.length !== 1 ? "s" : ""}`;
  if (totalFiltered > 0 || totalDeduped > 0) {
    const details: string[] = [];
    if (totalFiltered > 0) details.push(`${totalFiltered} static assets filtered`);
    if (totalDeduped > 0) details.push(`${totalDeduped} duplicates removed`);
    summary += ` (${details.join(", ")})`;
  }
  summary += ". Import into a new folder?";

  return {
    format: "har",
    summary,
    folders: [{ name: folderName }],
    requests,
  };
}

// =========================================================================
// Postman import
// =========================================================================

/**
 * Resolves a Postman URL object into a raw URL string.
 * @param url - The Postman URL (string or object).
 * @returns The raw URL string.
 */
function resolvePostmanUrl(url?: PostmanUrl): string {
  if (!url) return "";
  if (typeof url === "string") return url;
  if (url.raw) return url.raw;

  const host = (url.host || []).join(".");
  const path = (url.path || []).join("/");
  return host ? `${host}/${path}` : path;
}

/**
 * Converts Postman auth to curl headers.
 * @param auth - The Postman auth object.
 * @returns An object with headers to add and optional -u auth.
 */
function postmanAuthToHeaders(auth?: PostmanAuth): { headers: Record<string, string>; basicAuth?: { username: string; password: string } } {
  const headers: Record<string, string> = {};
  if (!auth) return { headers };

  switch (auth.type) {
    case "bearer": {
      const token = auth.bearer?.find((b) => b.key === "token")?.value || "";
      if (token) headers["Authorization"] = `Bearer ${token}`;
      break;
    }
    case "basic": {
      const username = auth.basic?.find((b) => b.key === "username")?.value || "";
      const password = auth.basic?.find((b) => b.key === "password")?.value || "";
      if (username) return { headers, basicAuth: { username, password } };
      break;
    }
    case "apikey": {
      const key = auth.apikey?.find((a) => a.key === "key")?.value || "";
      const value = auth.apikey?.find((a) => a.key === "value")?.value || "";
      const addTo = auth.apikey?.find((a) => a.key === "in")?.value || "header";
      if (key && addTo === "header") headers[key] = value;
      break;
    }
  }

  return { headers };
}

/**
 * Converts a Postman request to a curl command string.
 * @param pmRequest - The Postman request object.
 * @param folderAuth - Optional folder-level auth to inherit.
 * @returns A curl command string.
 */
function postmanRequestToCurl(pmRequest: PostmanRequest, folderAuth?: PostmanAuth): string {
  const method = (pmRequest.method || "GET").toUpperCase();
  const url = resolvePostmanUrl(pmRequest.url);

  const headers: Record<string, string> = {};
  for (const h of pmRequest.header || []) {
    if (!h.disabled) {
      headers[h.key] = h.value;
    }
  }

  const effectiveAuth = pmRequest.auth || folderAuth;
  const { headers: authHeaders, basicAuth } = postmanAuthToHeaders(effectiveAuth);
  Object.assign(headers, authHeaders);

  let body: string | undefined;
  let bodyType: RestApiRequest["bodyType"] = "none";

  if (pmRequest.body) {
    switch (pmRequest.body.mode) {
      case "raw":
        body = pmRequest.body.raw || "";
        if (pmRequest.body.options?.raw?.language === "json" || body.trim().startsWith("{") || body.trim().startsWith("[")) {
          bodyType = "json";
          if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
        } else {
          bodyType = "raw";
        }
        break;
      case "urlencoded": {
        const parts = (pmRequest.body.urlencoded || [])
          .filter((p) => !p.disabled)
          .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`);
        body = parts.join("&");
        bodyType = "form-urlencoded";
        if (!headers["Content-Type"]) headers["Content-Type"] = "application/x-www-form-urlencoded";
        break;
      }
      case "formdata": {
        const parts = (pmRequest.body.formdata || []).filter((p) => !p.disabled).map((p) => `${p.key}=${p.value}`);
        body = parts.join("&");
        bodyType = "form-data";
        break;
      }
    }
  }

  const request: RestApiRequest = {
    method: method as RestApiRequest["method"],
    url,
    headers,
    params: {},
    body,
    bodyType,
    auth: basicAuth,
  };

  return buildCurlCommand(request);
}

/**
 * Recursively flattens Postman item tree into folders and requests.
 * Nested folders are flattened with " - " separator.
 * @param items - The Postman items array.
 * @param parentPath - Accumulated folder path prefix.
 * @param parentAuth - Inherited auth from parent folder.
 * @param folders - Accumulator for discovered folders.
 * @param requests - Accumulator for discovered requests.
 */
function flattenPostmanItems(
  items: PostmanItem[],
  parentPath: string,
  parentAuth: PostmanAuth | undefined,
  folders: ImportedFolder[],
  requests: ImportedRequest[],
): void {
  for (const item of items) {
    if (item.item && item.item.length > 0) {
      const folderName = parentPath ? `${parentPath} - ${item.name || "Unnamed"}` : item.name || "Unnamed";
      folders.push({ name: folderName });
      flattenPostmanItems(item.item, folderName, item.auth || parentAuth, folders, requests);
    } else if (item.request) {
      const folderName = parentPath || "Default";
      if (!folders.some((f) => f.name === folderName)) {
        folders.push({ name: folderName });
      }
      requests.push({
        name: item.name || "Unnamed Request",
        folderName,
        curl: postmanRequestToCurl(item.request, item.auth || parentAuth),
      });
    }
  }
}

/**
 * Parses a Postman Collection v2.1 JSON.
 * @param collection - The parsed Postman Collection object.
 * @returns ImportDetectionResult with format "postman".
 */
function parsePostmanCollection(collection: PostmanCollection): ImportDetectionResult {
  const folders: ImportedFolder[] = [];
  const requests: ImportedRequest[] = [];

  flattenPostmanItems(collection.item || [], "", collection.auth, folders, requests);

  const variables = (collection.variable || []).map((v) => ({
    key: v.key,
    value: v.value || "",
    enabled: true,
  }));

  const collectionName = collection.info?.name || "Postman Import";
  const folderCount = folders.length;
  let summary = `Detected Postman collection "${collectionName}" with ${requests.length} request${requests.length !== 1 ? "s" : ""}`;
  if (folderCount > 0) {
    summary += ` in ${folderCount} folder${folderCount !== 1 ? "s" : ""}`;
  }
  if (variables.length > 0) {
    summary += ` and ${variables.length} variable${variables.length !== 1 ? "s" : ""}`;
  }
  summary += ". Import?";

  return {
    format: "postman",
    summary,
    folders,
    requests,
    variables,
  };
}

// =========================================================================
// Postman export
// =========================================================================

/** Postman Collection v2.1 schema URL. */
const POSTMAN_SCHEMA = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

/**
 * Converts a curl command to a Postman request object.
 * @param curlCommand - The curl command string.
 * @returns A Postman-formatted request object.
 */
function curlToPostmanRequest(curlCommand: string): PostmanRequest {
  const req = parseCurlCommand(curlCommand);

  const url: PostmanUrl = { raw: req.url };
  const header: PostmanHeader[] = Object.entries(req.headers).map(([key, value]) => ({ key, value }));

  const result: PostmanRequest = {
    method: req.method,
    url,
    header,
  };

  if (req.auth) {
    result.auth = {
      type: "basic",
      basic: [
        { key: "username", value: req.auth.username },
        { key: "password", value: req.auth.password },
      ],
    };
  }

  if (req.body) {
    switch (req.bodyType) {
      case "json":
        result.body = { mode: "raw", raw: req.body, options: { raw: { language: "json" } } };
        break;
      case "form-urlencoded": {
        const params = req.body.split("&").map((p) => {
          const [key, ...rest] = p.split("=");
          return { key: decodeURIComponent(key), value: decodeURIComponent(rest.join("=")) };
        });
        result.body = { mode: "urlencoded", urlencoded: params };
        break;
      }
      case "form-data": {
        const parts = req.body.split("&").map((p) => {
          const [key, ...rest] = p.split("=");
          return { key, value: rest.join("=") };
        });
        result.body = { mode: "formdata", formdata: parts };
        break;
      }
      default:
        result.body = { mode: "raw", raw: req.body };
        break;
    }
  }

  return result;
}

/** Input structure for Postman export. */
export type ExportPostmanInput = {
  /** Connection name (becomes collection name). */
  connectionName: string;
  /** Folders (managed databases) with their variables. */
  folders: { name: string; variables?: { key: string; value: string; enabled: boolean }[] }[];
  /** Requests (managed tables) with their curl commands and folder assignments. */
  requests: { name: string; folderName: string; curl: string }[];
  /** Connection-level variables. */
  variables?: { key: string; value: string; enabled: boolean }[];
};

/**
 * Exports REST API folders and requests as a Postman Collection v2.1 JSON string.
 * @param input - The connection data to export.
 * @returns A formatted JSON string of the Postman collection.
 */
export function exportAsPostmanCollection(input: ExportPostmanInput): string {
  const folderMap = new Map<string, PostmanItem[]>();
  for (const folder of input.folders) {
    folderMap.set(folder.name, []);
  }

  for (const req of input.requests) {
    const items = folderMap.get(req.folderName);
    const postmanItem: PostmanItem = {
      name: req.name,
      request: curlToPostmanRequest(req.curl),
    };
    if (items) {
      items.push(postmanItem);
    } else {
      if (!folderMap.has("Default")) {
        folderMap.set("Default", []);
      }
      folderMap.get("Default")!.push(postmanItem);
    }
  }

  const topLevelItems: PostmanItem[] = [];
  for (const [folderName, items] of folderMap) {
    if (items.length === 0) continue;
    topLevelItems.push({
      name: folderName,
      item: items,
    });
  }

  const collection: PostmanCollection = {
    info: {
      name: input.connectionName,
      schema: POSTMAN_SCHEMA,
    },
    item: topLevelItems,
  };

  if (input.variables && input.variables.length > 0) {
    collection.variable = input.variables.filter((v) => v.enabled).map((v) => ({ key: v.key, value: v.value, type: "string" }));
  }

  return JSON.stringify(collection, null, 2);
}
