/** REST API data adapter — IDataAdapter implementation for the rest dialect. */

import dns from "dns";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { executeCurl } from "src/common/adapters/RestApiDataAdapter/curlExecutor";
import { detectAndParse } from "src/common/adapters/RestApiDataAdapter/requestParser";
import { RestApiConnectionConfig, RestApiFolderProperties } from "src/common/adapters/RestApiDataAdapter/types";
import { findUnresolvedVariables, mergeVariableLayers, resolveVariables } from "src/common/adapters/RestApiDataAdapter/variableResolver";
import { getManagedDatabasesStorage } from "src/common/PersistentStorage";
import { SqluiCore } from "typings";

/**
 * Parses the rest:// connection string into a config object.
 * Also accepts legacy restapi:// prefix for backward compatibility.
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
  /** Set after construction to enable folder-level variable resolution. */
  connectionId?: string;

  /**
   * @param connectionOption - The rest:// connection string.
   */
  constructor(connectionOption: string) {
    super(connectionOption);
    this.dialect = "rest";
    this._config = parseRestApiConnectionString(connectionOption);
  }

  /**
   * Validates the HOST URL format (must be http:// or https://) and that the domain is DNS-resolvable.
   * @throws If HOST is invalid or the domain cannot be resolved.
   */
  async authenticate(): Promise<void> {
    const config = parseRestApiConnectionString(this.connectionOption);
    const host = config.HOST;
    if (!host) {
      // No HOST defined — just validate the config parses
      return;
    }

    // Validate URL format
    if (!/^https?:\/\/.+/i.test(host)) {
      throw new Error(`Invalid HOST format: "${host}". Must start with http:// or https://`);
    }

    // Extract hostname and verify DNS resolution
    let hostname: string;
    try {
      hostname = new URL(host).hostname;
    } catch (_err) {
      throw new Error(`Invalid HOST URL: "${host}"`);
    }

    await new Promise<void>((resolve, reject) => {
      dns.lookup(hostname, (err) => {
        if (err) {
          reject(new Error(`Cannot resolve host "${hostname}": ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Runs diagnostic HTTP checks (HEAD, GET, OPTIONS) against the HOST.
   * Results are informational — failures do not throw.
   * @returns Array of diagnostic results.
   */
  async runDiagnostics(): Promise<SqluiCore.ConnectionDiagnostic[]> {
    const config = parseRestApiConnectionString(this.connectionOption);
    const host = config.HOST;
    if (!host) {
      return [];
    }

    const methods: Array<"HEAD" | "GET" | "OPTIONS"> = ["HEAD", "GET", "OPTIONS"];
    const results: SqluiCore.ConnectionDiagnostic[] = [];

    for (const method of methods) {
      try {
        const response = await executeCurl({ method, url: host, headers: {}, params: {} }, 5000);
        const ok = response.status > 0 && response.status < 500;
        results.push({
          name: method,
          success: ok,
          message: `${response.status} ${response.statusText || ""}`.trim(),
        });
      } catch (err: any) {
        const msg = String(err.message || err);
        const curlErr = msg.match(/curl:\s*\(\d+\)\s*.+/)?.[0] || msg.split("\n")[0];
        results.push({ name: method, success: false, message: curlErr });
      }
    }

    return results;
  }

  /**
   * Returns an empty array — managed databases are read from persistent storage by DataAdapterFactory.
   * @returns Empty array (folders are managed externally).
   */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    return [];
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
   * Resolves {{VAR}} placeholders from collection and folder variables before execution.
   * @param sql - The curl or fetch() command string.
   * @param database - The folder name (used to fetch folder-level variables).
   * @param _table - The request name (unused).
   * @returns Result with response data in raw field.
   */
  async execute(sql: string, database?: string, _table?: string): Promise<SqluiCore.Result> {
    try {
      if (!sql || !sql.trim()) {
        return { ok: false, error: "No request to execute. Enter a curl or fetch() command." };
      }

      // Fetch folder-level variables if connectionId and database are available
      let folderVars: RestApiFolderProperties["variables"] | undefined;
      if (this.connectionId && database) {
        try {
          const dbStorage = await getManagedDatabasesStorage(this.connectionId);
          const folder = await dbStorage.get(database);
          folderVars = (folder?.props as RestApiFolderProperties | undefined)?.variables;
        } catch (_err) {
          // Non-fatal — fall back to connection-level variables only
        }
      }

      // Resolve variables — folder overrides collection, HOST is always injected
      const collectionVars = this._config.variables || [];
      const variables = mergeVariableLayers(collectionVars, folderVars);
      if (this._config.HOST) {
        variables["HOST"] = this._config.HOST;
      }
      const resolvedSql = resolveVariables(sql, variables);

      // Detect unresolved variables that will be sent as literal {{VAR}} strings
      const unresolvedVariables = findUnresolvedVariables(resolvedSql);

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
          unresolvedVariables,
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
