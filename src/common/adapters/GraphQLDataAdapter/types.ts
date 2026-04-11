/** GraphQL adapter types. */

import { RestApiTiming, RestApiVariable } from "src/common/adapters/RestApiDataAdapter/types";
import { SqluiCore } from "typings";

/** Parsed connection config from the graphql:// connection string JSON. */
export type GraphQLConnectionConfig = {
  /** GraphQL endpoint URL (e.g., "https://api.example.com/graphql"). */
  ENDPOINT?: string;
  /** Default headers sent with every request (e.g., Authorization). */
  headers?: Record<string, string>;
  /** Collection-level variables for {{VAR}} interpolation. */
  variables?: RestApiVariable[];
};

/** GraphQL folder-level properties extending generic ManagedProperties. */
export type GraphQLFolderProperties = SqluiCore.ManagedProperties & {
  /** Folder-level variables for {{VAR}} interpolation. */
  variables?: RestApiVariable[];
  /** Optional description of the folder. */
  description?: string;
};

/** GraphQL saved query properties extending generic ManagedProperties. */
export type GraphQLRequestProperties = SqluiCore.ManagedProperties & {
  /** The GraphQL query/mutation text (editor content with optional ### sections). */
  query?: string;
  /** Optional description of the saved query. */
  description?: string;
};

/** Parsed GraphQL request (intermediate format before execution). */
export type GraphQLRequest = {
  /** The GraphQL query or mutation string. */
  query: string;
  /** Query variables as a JSON object. */
  variables?: Record<string, any>;
  /** Optional operation name when the document contains multiple operations. */
  operationName?: string;
  /** Request headers to send alongside the GraphQL POST. */
  headers: Record<string, string>;
};

/** Structured GraphQL response returned by the executor. */
export type GraphQLResponse = {
  /** HTTP status code. */
  status: number;
  /** HTTP status text (e.g., "OK", "Not Found"). */
  statusText: string;
  /** Response headers as key-value pairs. */
  headers: Record<string, string>;
  /** Raw response body string. */
  body: string;
  /** Parsed GraphQL response body. */
  bodyParsed?: {
    /** The data returned by the GraphQL operation. */
    data?: any;
    /** Array of GraphQL errors. */
    errors?: Array<{ message: string; locations?: any[]; path?: any[]; extensions?: any }>;
    /** Server-specific extensions (e.g., tracing, cost). */
    extensions?: any;
  };
  /** Request timing breakdown. */
  timing: RestApiTiming;
  /** Response body size in bytes. */
  size: number;
};
