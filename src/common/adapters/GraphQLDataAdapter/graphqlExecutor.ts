/** GraphQL executor — bridges GraphQLRequest to the REST API curl executor. */

import { executeCurl } from "src/common/adapters/RestApiDataAdapter/curlExecutor";
import { RestApiRequest } from "src/common/adapters/RestApiDataAdapter/types";
import { GraphQLRequest, GraphQLResponse } from "src/common/adapters/GraphQLDataAdapter/types";

/** Default timeout in milliseconds for GraphQL requests. */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Executes a GraphQL request by converting it to a REST API curl request.
 * Sends an HTTP POST with JSON body containing query, variables, and operationName.
 * @param request - The parsed GraphQL request.
 * @param endpoint - The GraphQL endpoint URL.
 * @param timeoutMs - Optional timeout in milliseconds (defaults to 30s).
 * @returns Structured GraphQL response with parsed data/errors/extensions.
 */
export async function executeGraphQL(
  request: GraphQLRequest,
  endpoint: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<GraphQLResponse> {
  // Build the JSON body
  const body: Record<string, any> = { query: request.query };
  if (request.variables && Object.keys(request.variables).length > 0) {
    body.variables = request.variables;
  }
  if (request.operationName) {
    body.operationName = request.operationName;
  }

  // Convert to RestApiRequest for the curl executor
  const curlRequest: RestApiRequest = {
    method: "POST",
    url: endpoint,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...request.headers,
    },
    params: {},
    body: JSON.stringify(body),
  };

  const response = await executeCurl(curlRequest, timeoutMs);

  // Parse GraphQL-specific fields from the response body
  let bodyParsed: GraphQLResponse["bodyParsed"];
  if (response.bodyParsed && typeof response.bodyParsed === "object") {
    bodyParsed = {
      data: response.bodyParsed.data,
      errors: response.bodyParsed.errors,
      extensions: response.bodyParsed.extensions,
    };
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    body: response.body,
    bodyParsed,
    timing: response.timing,
    size: response.size,
  };
}
