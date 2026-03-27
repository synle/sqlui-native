/** Request parser auto-router — detects curl vs fetch syntax and delegates to the right parser. */

import { buildCurlCommand, parseCurlCommand } from "src/common/adapters/RestApiDataAdapter/curlParser";
import { buildFetchCommand, parseFetchCommand } from "src/common/adapters/RestApiDataAdapter/fetchParser";
import { RestApiRequest } from "src/common/adapters/RestApiDataAdapter/types";

/** Detected input format type. */
export type RequestFormat = "curl" | "fetch";

/**
 * Detects whether the input is a curl command or a fetch() call.
 * @param input - The raw input string from the editor.
 * @returns The detected format.
 */
export function detectFormat(input: string): RequestFormat {
  const trimmed = input.trim();
  if (trimmed.startsWith("fetch(") || trimmed.startsWith("fetch (")) {
    return "fetch";
  }
  return "curl";
}

/**
 * Auto-detects the format and parses the input into a RestApiRequest.
 * @param input - The raw curl or fetch() string from the editor.
 * @returns Parsed request object.
 */
export function detectAndParse(input: string): RestApiRequest {
  const format = detectFormat(input);
  if (format === "fetch") {
    return parseFetchCommand(input);
  }
  return parseCurlCommand(input);
}

/**
 * Converts a RestApiRequest to the specified format string.
 * @param request - The structured request.
 * @param format - The target format ("curl" or "fetch").
 * @returns The formatted command string.
 */
export function buildCommand(request: RestApiRequest, format: RequestFormat): string {
  if (format === "fetch") {
    return buildFetchCommand(request);
  }
  return buildCurlCommand(request);
}
