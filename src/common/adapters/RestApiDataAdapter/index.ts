/** REST API data adapter — IDataAdapter implementation for the restapi/rest dialect. */

import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { executeCurl } from "src/common/adapters/RestApiDataAdapter/curlExecutor";
import { detectAndParse } from "src/common/adapters/RestApiDataAdapter/requestParser";
import { RestApiConnectionConfig } from "src/common/adapters/RestApiDataAdapter/types";
import { mergeVariableLayers, resolveVariables } from "src/common/adapters/RestApiDataAdapter/variableResolver";
import { SqluiCore } from "typings";

/**
 * Parses the restapi:// or rest:// connection string into a config object.
 * Format: restapi://{"variables":[...]} or restapi://{}
 * @param connectionOption - The raw connection string URI.
 * @returns Parsed connection config.
 */
function parseRestApiConnectionString(connectionOption: string): RestApiConnectionConfig {
  const withoutScheme = connectionOption.replace(/^(restapi|rest):\/\//, "");
  try {
    return JSON.parse(withoutScheme || "{}");
  } catch (_err) {
    return {};
  }
}

/**
 * REST API data adapter for making HTTP requests via curl/fetch syntax.
 * Maps Connection = Collection, Database = Folder, Table = Saved Request.
 */
export default class RestApiDataAdapter extends BaseDataAdapter implements IDataAdapter {
  private _config: RestApiConnectionConfig;

  /**
   * @param connectionOption - The restapi:// connection string.
   */
  constructor(connectionOption: string) {
    super(connectionOption);
    this.dialect = "restapi";
    this._config = parseRestApiConnectionString(connectionOption);
  }

  /**
   * Validates the connection string is parseable.
   * REST API connections are stateless — no persistent connection to verify.
   */
  async authenticate(): Promise<void> {
    // Just verify the config parses. No server to ping.
    parseRestApiConnectionString(this.connectionOption);
  }

  /**
   * Returns folders for this collection.
   * A default folder is always present.
   * @returns Array of database metadata representing folders.
   */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    return [
      {
        name: "Default",
        tables: [],
      },
    ];
  }

  /**
   * Returns saved requests within a folder.
   * Initially empty — requests are created by the user.
   * @param _database - The folder name.
   * @returns Array of table metadata representing saved requests.
   */
  async getTables(_database?: string): Promise<SqluiCore.TableMetaData[]> {
    return [];
  }

  /**
   * Returns metadata fields for a saved request.
   * These describe the shape of an HTTP request.
   * @param _table - The request name.
   * @param _database - The folder name.
   * @returns Column metadata describing request fields.
   */
  async getColumns(_table?: string, _database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    return [
      { name: "method", type: "string" },
      { name: "url", type: "string" },
      { name: "headers", type: "json" },
      { name: "params", type: "json" },
      { name: "body", type: "text" },
      { name: "bodyType", type: "string" },
    ];
  }

  /**
   * Executes an HTTP request from a curl or fetch() command string.
   * Resolves {{VAR}} placeholders from collection variables before execution.
   * @param sql - The curl or fetch() command string.
   * @param _database - The folder name (unused, reserved for folder-level variables).
   * @param _table - The request name (unused).
   * @returns Result with response data in raw field.
   */
  async execute(sql: string, _database?: string, _table?: string): Promise<SqluiCore.Result> {
    try {
      if (!sql || !sql.trim()) {
        return { ok: false, error: "No request to execute. Enter a curl or fetch() command." };
      }

      // Resolve variables
      const collectionVars = this._config.variables || [];
      const variables = mergeVariableLayers(collectionVars);
      const resolvedSql = resolveVariables(sql, variables);

      // Parse the command (auto-detect curl vs fetch)
      const request = detectAndParse(resolvedSql);

      if (!request.url) {
        return { ok: false, error: "No URL found in the request. Check your curl or fetch() syntax." };
      }

      // Execute via curl
      const response = await executeCurl(request);

      // Format result for ResultBox
      const resultRow: Record<string, any> = {
        status: response.status,
        statusText: response.statusText,
        timing: response.timing,
        size: response.size,
        headers: response.headers,
        cookies: response.cookies,
        body: response.bodyParsed || response.body,
      };

      return {
        ok: true,
        raw: [resultRow],
        meta: {
          isRestApi: true,
          status: response.status,
          statusText: response.statusText,
          timing: response.timing,
          size: response.size,
          responseHeaders: response.headers,
          responseCookies: response.cookies,
          responseBody: response.body,
          responseBodyParsed: response.bodyParsed,
          requestMethod: request.method,
          requestUrl: request.url,
          requestHeaders: request.headers,
          requestBody: request.body,
        },
      };
    } catch (error: any) {
      console.error("RestApiDataAdapter:execute", error);
      return { ok: false, error: error.message || JSON.stringify(error, null, 2) };
    }
  }

  /**
   * No-op disconnect — HTTP is stateless.
   */
  async disconnect(): Promise<void> {
    // Nothing to close
  }
}
