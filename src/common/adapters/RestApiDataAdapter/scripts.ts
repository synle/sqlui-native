/** Script generator for the REST API dialect — curl/fetch request templates. */

import BaseDataScript, { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import { SqlAction, SqluiCore } from "typings";

/** Formatter hint for shell/curl syntax highlighting. */
const shellFormatter = "shell";

// ============================================================
// Table-Level Scripts (Request Templates)
// ============================================================

/**
 * Generates a simple GET request template.
 * @param input - Table input with URL context.
 * @returns Script output with a curl GET command.
 */
export function getSimpleGet(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "GET Request",
    formatter: shellFormatter,
    query: `curl '{{HOST}}/${input.tableId || "endpoint"}'`,
  };
}

/**
 * Generates a GET request with authorization header.
 * @param input - Table input with URL context.
 * @returns Script output with an authenticated curl GET.
 */
export function getGetWithAuth(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "GET with Auth",
    formatter: shellFormatter,
    query: `curl '{{HOST}}/${input.tableId || "endpoint"}' \\\n  -H 'Authorization: Bearer {{TOKEN}}'`,
  };
}

/**
 * Generates a POST request with JSON body.
 * @param input - Table input with URL context.
 * @returns Script output with a curl POST command.
 */
export function getPostJson(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "POST JSON",
    formatter: shellFormatter,
    query: `curl -X POST '{{HOST}}/${input.tableId || "endpoint"}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"key": "value"}'`,
  };
}

/**
 * Generates a PUT request with JSON body.
 * @param input - Table input with URL context.
 * @returns Script output with a curl PUT command.
 */
export function getPutJson(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "PUT JSON",
    formatter: shellFormatter,
    query: `curl -X PUT '{{HOST}}/${input.tableId || "endpoint"}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"key": "updated_value"}'`,
  };
}

/**
 * Generates a PATCH request with JSON body.
 * @param input - Table input with URL context.
 * @returns Script output with a curl PATCH command.
 */
export function getPatchJson(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "PATCH JSON",
    formatter: shellFormatter,
    query: `curl -X PATCH '{{HOST}}/${input.tableId || "endpoint"}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"key": "patched_value"}'`,
  };
}

/**
 * Generates a DELETE request.
 * @param input - Table input with URL context.
 * @returns Script output with a curl DELETE command.
 */
export function getDeleteRequest(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "DELETE Request",
    formatter: shellFormatter,
    query: `curl -X DELETE '{{HOST}}/${input.tableId || "endpoint"}'`,
  };
}

/**
 * Generates a POST request with form-urlencoded body.
 * @param input - Table input with URL context.
 * @returns Script output with a curl form POST.
 */
export function getFormPost(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "POST Form Data",
    formatter: shellFormatter,
    query: `curl -X POST '{{HOST}}/${input.tableId || "endpoint"}' \\\n  -d 'field1=value1&field2=value2'`,
  };
}

/**
 * Generates a file upload request with multipart form data.
 * @param input - Table input with URL context.
 * @returns Script output with a curl file upload.
 */
export function getFileUpload(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "File Upload",
    formatter: shellFormatter,
    query: `curl -X POST '{{HOST}}/${input.tableId || "upload"}' \\\n  -F 'file=@/path/to/file'`,
  };
}

/**
 * Generates a request with basic auth.
 * @param input - Table input with URL context.
 * @returns Script output with a curl basic auth request.
 */
export function getBasicAuth(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Basic Auth",
    formatter: shellFormatter,
    query: `curl -u 'username:password' '{{HOST}}/${input.tableId || "endpoint"}'`,
  };
}

/**
 * Generates a request with query parameters.
 * @param input - Table input with URL context.
 * @returns Script output with a curl request including query params.
 */
export function getWithQueryParams(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "GET with Params",
    formatter: shellFormatter,
    query: `curl '{{HOST}}/${input.tableId || "endpoint"}?page=1&limit=10'`,
  };
}

/**
 * Generates a fetch() GET request template.
 * @param input - Table input with URL context.
 * @returns Script output with a fetch() GET call.
 */
export function getFetchGet(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "GET (fetch syntax)",
    formatter: shellFormatter,
    query: `fetch("{{HOST}}/${input.tableId || "endpoint"}", {\n  "headers": {\n    "accept": "application/json"\n  },\n  "method": "GET"\n});`,
  };
}

/**
 * Generates a fetch() POST request template.
 * @param input - Table input with URL context.
 * @returns Script output with a fetch() POST call.
 */
export function getFetchPost(input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "POST (fetch syntax)",
    formatter: shellFormatter,
    query: `fetch("{{HOST}}/${input.tableId || "endpoint"}", {\n  "headers": {\n    "accept": "application/json",\n    "content-type": "application/json"\n  },\n  "body": "{\\"key\\": \\"value\\"}",\n  "method": "POST"\n});`,
  };
}

// ============================================================
// Connection-Level Scripts
// ============================================================

/**
 * Generates a health check request at the connection level.
 * @param _input - Connection input (unused).
 * @returns Script output with a health check curl.
 */
export function getHealthCheck(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  return {
    label: "Health Check",
    formatter: shellFormatter,
    query: `curl '{{HOST}}/health'`,
  };
}

/**
 * Generates an OPTIONS request at the connection level.
 * @param _input - Connection input (unused).
 * @returns Script output with an OPTIONS curl.
 */
export function getOptionsRequest(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  return {
    label: "OPTIONS (CORS check)",
    formatter: shellFormatter,
    query: `curl -X OPTIONS '{{HOST}}' -i`,
  };
}

/**
 * Generates a HEAD request at the connection level.
 * @param _input - Connection input (unused).
 * @returns Script output with a HEAD curl.
 */
export function getHeadRequest(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  return {
    label: "HEAD Request",
    formatter: shellFormatter,
    query: `curl -I '{{HOST}}'`,
  };
}

// ============================================================
// Script class
// ============================================================

/** Script generator for the REST API (restapi/rest) dialect. */
export class ConcreteDataScripts extends BaseDataScript {
  /** Supported dialect identifiers for REST API. */
  dialects = ["restapi", "rest"];

  /** Returns connection form inputs — just collection-level variables as JSON. */
  getConnectionFormInputs() {
    return [["variables", "Variables (JSON array)", "optional"]];
  }

  /** Returns "json" because REST API uses JSON-based connection strings. */
  getConnectionStringFormat(): "url" | "json" | "ado" {
    return "json";
  }

  /** Returns false — table ID is not required for executing curl/fetch commands. */
  getIsTableIdRequiredForQuery() {
    return false;
  }

  /** Returns "shell" syntax mode for curl/fetch syntax highlighting. */
  getSyntaxMode() {
    return "shell";
  }

  /** Returns false — REST API does not support data migration. */
  supportMigration() {
    return false;
  }

  /** Returns false — REST API does not use create record forms. */
  supportCreateRecordForm() {
    return false;
  }

  /** Returns false — REST API does not use edit record forms. */
  supportEditRecordForm() {
    return false;
  }

  /**
   * Returns the canonical "restapi" dialect type for both "restapi" and "rest" aliases.
   * @param _dialect - The raw dialect string.
   * @returns The "restapi" dialect identifier.
   */
  getDialectType(_dialect) {
    return "restapi" as SqluiCore.Dialect;
  }

  /**
   * Returns the display name "REST API" for this dialect.
   * @param _dialect - The dialect string (unused).
   * @returns The "REST API" display name.
   */
  getDialectName(_dialect) {
    return "REST API";
  }

  /**
   * Returns the REST API dialect icon asset.
   * @param _dialect - The dialect string (unused).
   * @returns Empty string for now (icon to be added).
   */
  getDialectIcon(_dialect) {
    return "";
  }

  /**
   * Returns table-level script generators for REST API request templates.
   * @returns Array of curl and fetch template generators.
   */
  getTableScripts() {
    return [
      // Curl templates
      getSimpleGet,
      getGetWithAuth,
      getWithQueryParams,
      getDivider,
      getPostJson,
      getPutJson,
      getPatchJson,
      getDeleteRequest,
      getDivider,
      getFormPost,
      getFileUpload,
      getBasicAuth,
      getDivider,
      // Fetch templates
      getFetchGet,
      getFetchPost,
    ];
  }

  /** Returns empty array — no database-level scripts for REST API. */
  getDatabaseScripts() {
    return [];
  }

  /**
   * Returns connection-level script generators for REST API.
   * @returns Array of connection-level request generators.
   */
  getConnectionScripts() {
    return [getDivider, getHealthCheck, getOptionsRequest, getHeadRequest];
  }

  /**
   * Returns a sample REST API connection string.
   * @param _dialect - The dialect identifier.
   * @returns A sample restapi:// connection string.
   */
  getSampleConnectionString(_dialect) {
    return `restapi://{}`;
  }

  /** Returns REST API setup guide HTML. */
  getConnectionSetupGuide(): string {
    return `
      <strong>REST API Collection Setup</strong>
      <ol>
        <li><strong>Connection String</strong> -- Use <code>restapi://{}</code> for an empty collection, or <code>restapi://{"variables":[{"key":"HOST","value":"https://api.example.com","enabled":true}]}</code> to set variables.</li>
        <li><strong>Variables</strong> -- Define <code>{{HOST}}</code>, <code>{{TOKEN}}</code>, etc. at collection level. Override per folder.</li>
        <li><strong>Syntax</strong> -- Use <code>curl</code> or <code>fetch()</code> syntax in the editor. Both are auto-detected.</li>
        <li><strong>Paste from DevTools</strong> -- Right-click a request in Chrome DevTools &gt; Copy as cURL / Copy as fetch.</li>
      </ol>
    `;
  }

  /**
   * Returns a sample GET request for the given table input.
   * @param tableActionInput - The table context for generating the sample.
   * @returns Script output with the sample curl GET.
   */
  getSampleSelectQuery(tableActionInput) {
    return getSimpleGet(tableActionInput);
  }

  /**
   * Generates a connection code snippet for the given language.
   * @param _connection - The connection properties (unused).
   * @param query - The query context containing the curl/fetch command.
   * @param language - The target language.
   * @returns A code snippet string.
   */
  getCodeSnippet(_connection, query, language) {
    const cmd = query.sql || "";
    switch (language) {
      case "javascript":
        return `// Using fetch API\n${cmd}`;
      case "python":
        return `# Using requests library\nimport requests\n\n# Paste your curl command into a tool like curlconverter.com\n# Original command:\n# ${cmd.replace(/\n/g, "\n# ")}`;
      case "java":
        return `// Using HttpClient (Java 11+)\n// Original command:\n// ${cmd.replace(/\n/g, "\n// ")}`;
      default:
        return "";
    }
  }
}

export default new ConcreteDataScripts();
