/** GraphQL input parser — splits editor content into query, variables, and headers sections. */

import { GraphQLRequest } from "src/common/adapters/GraphQLDataAdapter/types";

/** Section delimiter for variables block. */
const VARIABLES_MARKER = "### Variables";

/** Section delimiter for headers block. */
const HEADERS_MARKER = "### Headers";

/** Section delimiter for operation name block. */
const OPERATION_MARKER = "### Operation";

/**
 * Parses a structured GraphQL editor input into a GraphQLRequest.
 *
 * The input format is plain GraphQL with optional delimited sections:
 * ```
 * query { users { id name } }
 *
 * ### Variables
 * {"limit": 10}
 *
 * ### Headers
 * Authorization: Bearer token
 *
 * ### Operation
 * GetUsers
 * ```
 *
 * @param input - The raw editor content.
 * @returns Parsed GraphQLRequest (without endpoint — that comes from connection config).
 * @throws If input is empty or variables JSON is malformed.
 */
export function parseGraphQLInput(input: string): GraphQLRequest {
  if (!input || !input.trim()) {
    throw new Error("No GraphQL query to execute. Enter a query or mutation.");
  }

  // Find section boundaries
  const variablesIdx = input.indexOf(VARIABLES_MARKER);
  const headersIdx = input.indexOf(HEADERS_MARKER);
  const operationIdx = input.indexOf(OPERATION_MARKER);

  // Collect all marker positions to find where the query section ends
  const markerPositions = [variablesIdx, headersIdx, operationIdx].filter((idx) => idx >= 0);
  const firstMarker = markerPositions.length > 0 ? Math.min(...markerPositions) : -1;

  // Extract query (everything before the first ### marker)
  const query = (firstMarker >= 0 ? input.substring(0, firstMarker) : input).trim();

  if (!query) {
    throw new Error("No GraphQL query found. Enter a query or mutation before any ### sections.");
  }

  // Extract variables section
  let variables: Record<string, any> | undefined;
  if (variablesIdx >= 0) {
    const variablesContent = extractSection(input, variablesIdx + VARIABLES_MARKER.length, [headersIdx, operationIdx]);
    if (variablesContent.trim()) {
      try {
        variables = JSON.parse(variablesContent.trim());
      } catch (_err) {
        throw new Error(`Invalid JSON in ### Variables section: ${variablesContent.trim()}`);
      }
    }
  }

  // Extract headers section
  const headers: Record<string, string> = {};
  if (headersIdx >= 0) {
    const headersContent = extractSection(input, headersIdx + HEADERS_MARKER.length, [variablesIdx, operationIdx]);
    for (const line of headersContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx > 0) {
        const key = trimmed.substring(0, colonIdx).trim();
        const value = trimmed.substring(colonIdx + 1).trim();
        headers[key] = value;
      }
    }
  }

  // Extract operation name section
  let operationName: string | undefined;
  if (operationIdx >= 0) {
    const operationContent = extractSection(input, operationIdx + OPERATION_MARKER.length, [variablesIdx, headersIdx]);
    const trimmed = operationContent.trim();
    if (trimmed) {
      operationName = trimmed;
    }
  }

  return { query, variables, operationName, headers };
}

/**
 * Extracts text from a start position until the next section marker or end of input.
 * @param input - The full input string.
 * @param start - The character offset after the current marker.
 * @param otherMarkerPositions - Positions of other markers (may include -1 for absent ones).
 * @returns The extracted section content.
 */
function extractSection(input: string, start: number, otherMarkerPositions: number[]): string {
  // Find the nearest marker that comes after our start position
  const nextMarker = otherMarkerPositions.filter((idx) => idx > start).sort((a, b) => a - b)[0];
  return nextMarker !== undefined ? input.substring(start, nextMarker) : input.substring(start);
}
