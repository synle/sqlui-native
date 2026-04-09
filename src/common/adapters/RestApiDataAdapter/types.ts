/** REST API adapter types. */

import { SqluiCore } from "typings";

/** REST API folder-level properties extending generic ManagedProperties. */
export type RestApiFolderProperties = SqluiCore.ManagedProperties & {
  /** Folder-level variables for {{VAR}} interpolation. */
  variables?: RestApiVariable[];
  /** Optional description of the folder. */
  description?: string;
};

/** REST API request-level properties extending generic ManagedProperties. */
export type RestApiRequestProperties = SqluiCore.ManagedProperties & {
  /** The curl/fetch command string for this request. */
  query?: string;
  /** Optional description of the request. */
  description?: string;
};

/** A single variable entry for {{VAR}} interpolation. */
export type RestApiVariable = {
  /** Variable name (used as {{key}} in templates). */
  key: string;
  /** Variable value to substitute. */
  value: string;
  /** Whether this variable is active. Disabled variables are skipped during resolution. */
  enabled: boolean;
};

/** Named set of variables for environment switching (e.g., dev, staging, prod). */
export type RestApiEnvironment = {
  /** Environment display name. */
  name: string;
  /** Variables defined in this environment. */
  variables: RestApiVariable[];
};

/** Parsed connection config from the rest:// connection string JSON. */
export type RestApiConnectionConfig = {
  /** Base host URL for the API collection. */
  HOST?: string;
  /** Collection-level variables. */
  variables?: RestApiVariable[];
};

/** Supported HTTP methods. */
export type RestApiMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

/** Parsed HTTP request (intermediate format between curl/fetch and execution). */
export type RestApiRequest = {
  /** HTTP method. */
  method: RestApiMethod;
  /** Full request URL. */
  url: string;
  /** Request headers as key-value pairs. */
  headers: Record<string, string>;
  /** Query parameters (extracted from URL or explicit). */
  params: Record<string, string>;
  /** Request body string. */
  body?: string;
  /** Body content type hint. */
  bodyType?: "json" | "form-urlencoded" | "form-data" | "raw" | "none";
  /** Multipart form parts from -F/--form flags (e.g., "field=value", "file=@/path/to/file"). */
  formParts?: string[];
  /** Cookie string from -b flag or credentials. */
  cookies?: string;
  /** Whether to follow redirects. */
  followRedirects?: boolean;
  /** Whether to skip SSL verification. */
  insecure?: boolean;
  /** Basic auth credentials. */
  auth?: { username: string; password: string };
};

/** Timing breakdown from curl --write-out. */
export type RestApiTiming = {
  /** Total request duration in milliseconds. */
  total: number;
  /** DNS lookup time in milliseconds. */
  dns?: number;
  /** TCP connect time in milliseconds. */
  connect?: number;
  /** TLS handshake time in milliseconds. */
  tls?: number;
  /** Time to first byte in milliseconds. */
  ttfb?: number;
};

/** Structured HTTP response returned by the executor. */
export type RestApiResponse = {
  /** HTTP status code. */
  status: number;
  /** HTTP status text (e.g., "OK", "Not Found"). */
  statusText: string;
  /** Response headers as key-value pairs. */
  headers: Record<string, string>;
  /** Raw response body string. */
  body: string;
  /** Parsed body (JSON, if applicable). */
  bodyParsed?: any;
  /** Request timing breakdown. */
  timing: RestApiTiming;
  /** Parsed Set-Cookie headers. */
  cookies: Record<string, string>;
  /** Response body size in bytes. */
  size: number;
};

/** HAR 1.2 header/param entry. */
export type HarNameValue = {
  /** Header or parameter name. */
  name: string;
  /** Header or parameter value. */
  value: string;
};

/** HAR 1.2 request object. */
export type HarRequest = {
  /** HTTP method. */
  method: string;
  /** Full URL. */
  url: string;
  /** HTTP version string. */
  httpVersion: string;
  /** Request headers. */
  headers: HarNameValue[];
  /** Query string parameters. */
  queryString: HarNameValue[];
  /** POST data. */
  postData?: { mimeType: string; text: string };
  /** Cookie entries. */
  cookies: HarNameValue[];
  /** Total header size in bytes (-1 if unknown). */
  headersSize: number;
  /** Total body size in bytes (-1 if unknown). */
  bodySize: number;
};

/** HAR 1.2 response object. */
export type HarResponse = {
  /** HTTP status code. */
  status: number;
  /** HTTP status text. */
  statusText: string;
  /** HTTP version string. */
  httpVersion: string;
  /** Response headers. */
  headers: HarNameValue[];
  /** Response content. */
  content: { size: number; mimeType: string; text?: string };
  /** Redirect URL if any. */
  redirectURL: string;
  /** Total header size in bytes (-1 if unknown). */
  headersSize: number;
  /** Total body size in bytes (-1 if unknown). */
  bodySize: number;
  /** Cookie entries. */
  cookies: HarNameValue[];
};

/** HAR 1.2 timing object. */
export type HarTimings = {
  /** Time to send request in ms. */
  send: number;
  /** Time waiting for response in ms. */
  wait: number;
  /** Time to receive response in ms. */
  receive: number;
  /** DNS lookup time in ms (-1 if not applicable). */
  dns?: number;
  /** TCP connect time in ms (-1 if not applicable). */
  connect?: number;
  /** TLS handshake time in ms (-1 if not applicable). */
  ssl?: number;
};

/** HAR 1.2 entry. */
export type HarEntry = {
  /** Start time in ISO 8601 format. */
  startedDateTime: string;
  /** Total elapsed time in ms. */
  time: number;
  /** Request details. */
  request: HarRequest;
  /** Response details. */
  response: HarResponse;
  /** Timing breakdown. */
  timings: HarTimings;
};

/** HAR 1.2 log object. */
export type HarLog = {
  /** HAR format version. */
  version: string;
  /** Tool that created this HAR file. */
  creator: { name: string; version: string };
  /** List of HTTP entries. */
  entries: HarEntry[];
};
