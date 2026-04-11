/** GraphQL data adapter — IDataAdapter implementation for the graphql dialect. */

import dns from "dns";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import { executeGraphQL } from "src/common/adapters/GraphQLDataAdapter/graphqlExecutor";
import { parseGraphQLInput } from "src/common/adapters/GraphQLDataAdapter/graphqlParser";
import { GraphQLConnectionConfig, GraphQLFolderProperties } from "src/common/adapters/GraphQLDataAdapter/types";
import { executeCurl } from "src/common/adapters/RestApiDataAdapter/curlExecutor";
import { findUnresolvedVariables, mergeVariableLayers, resolveVariables } from "src/common/adapters/RestApiDataAdapter/variableResolver";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { getManagedDatabasesStorage } from "src/common/PersistentStorage";
import { SqluiCore } from "typings";

/**
 * Parses the graphql:// connection string into a config object.
 * @param connectionOption - The raw connection string URI.
 * @returns Parsed connection config.
 */
function parseGraphQLConnectionString(connectionOption: string): GraphQLConnectionConfig {
  const withoutScheme = connectionOption.replace(/^graphql:\/\//, "");
  try {
    return JSON.parse(withoutScheme || "{}");
  } catch (_err) {
    return {};
  }
}

/**
 * GraphQL data adapter for executing GraphQL queries via HTTP POST.
 * Maps Connection = API collection, Database = Folder, Table = Saved Query.
 */
export default class GraphQLDataAdapter extends BaseDataAdapter implements IDataAdapter {
  private _config: GraphQLConnectionConfig;
  /** Set after construction to enable folder-level variable resolution. */
  connectionId?: string;

  /**
   * @param connectionOption - The graphql:// connection string.
   */
  constructor(connectionOption: string) {
    super(connectionOption);
    this.dialect = "graphql";
    this._config = parseGraphQLConnectionString(connectionOption);
  }

  /**
   * Validates the ENDPOINT URL format (must be http:// or https://) and that the domain is DNS-resolvable.
   * @throws If ENDPOINT is invalid or the domain cannot be resolved.
   */
  async authenticate(): Promise<void> {
    const config = parseGraphQLConnectionString(this.connectionOption);
    const endpoint = config.ENDPOINT;
    if (!endpoint) {
      // No ENDPOINT defined — just validate the config parses
      return;
    }

    // Validate URL format
    if (!/^https?:\/\/.+/i.test(endpoint)) {
      throw new Error(`Invalid ENDPOINT format: "${endpoint}". Must start with http:// or https://`);
    }

    // Extract hostname and verify DNS resolution
    let hostname: string;
    try {
      hostname = new URL(endpoint).hostname;
    } catch (_err) {
      throw new Error(`Invalid ENDPOINT URL: "${endpoint}"`);
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
   * Runs a lightweight introspection query to verify the endpoint is a valid GraphQL server.
   * @returns Array of diagnostic results.
   */
  async runDiagnostics(): Promise<SqluiCore.ConnectionDiagnostic[]> {
    const config = parseGraphQLConnectionString(this.connectionOption);
    const endpoint = config.ENDPOINT;
    if (!endpoint) {
      return [];
    }

    const results: SqluiCore.ConnectionDiagnostic[] = [];

    // Test with a simple introspection query
    try {
      const response = await executeCurl(
        {
          method: "POST",
          url: endpoint,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(config.headers || {}),
          },
          params: {},
          body: JSON.stringify({ query: "{ __typename }" }),
        },
        5000,
      );
      const ok = response.status >= 200 && response.status < 400;
      results.push({
        name: "Introspection",
        success: ok,
        message: `${response.status} ${response.statusText || ""}`.trim(),
      });
    } catch (err: any) {
      const msg = String(err.message || err);
      const curlErr = msg.match(/curl:\s*\(\d+\)\s*.+/)?.[0] || msg.split("\n")[0];
      results.push({ name: "Introspection", success: false, message: curlErr });
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
   * Returns an empty array — managed tables are read from persistent storage by DataAdapterFactory.
   * @param _database - The folder name.
   * @returns Empty array (saved queries are managed externally).
   */
  async getTables(_database?: string): Promise<SqluiCore.TableMetaData[]> {
    return [];
  }

  /**
   * Returns metadata fields describing the shape of a GraphQL request.
   * @param _table - The saved query name.
   * @param _database - The folder name.
   * @returns Column metadata describing GraphQL request fields.
   */
  async getColumns(_table?: string, _database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    return [
      { name: "query", type: "graphql" },
      { name: "variables", type: "json" },
      { name: "operationName", type: "string" },
      { name: "headers", type: "json" },
    ];
  }

  /**
   * Executes a GraphQL query or mutation.
   * Resolves {{VAR}} placeholders from collection and folder variables before execution.
   * @param sql - The GraphQL editor content (query with optional ### sections).
   * @param database - The folder name (used to fetch folder-level variables).
   * @param _table - The saved query name (unused).
   * @returns Result with GraphQL response data in raw field.
   */
  async execute(sql: string, database?: string, _table?: string): Promise<SqluiCore.Result> {
    try {
      if (!sql || !sql.trim()) {
        return { ok: false, error: "No query to execute. Enter a GraphQL query or mutation." };
      }

      // Fetch folder-level variables if connectionId and database are available
      let folderVars: GraphQLFolderProperties["variables"] | undefined;
      if (this.connectionId && database) {
        try {
          const dbStorage = await getManagedDatabasesStorage(this.connectionId);
          const folder = await dbStorage.get(database);
          folderVars = (folder?.props as GraphQLFolderProperties | undefined)?.variables;
        } catch (_err) {
          // Non-fatal — fall back to connection-level variables only
        }
      }

      // Resolve variables — folder overrides collection, ENDPOINT is always injected
      const collectionVars = this._config.variables || [];
      const variables = mergeVariableLayers(collectionVars, folderVars);
      if (this._config.ENDPOINT) {
        variables["ENDPOINT"] = this._config.ENDPOINT;
      }
      const resolvedSql = resolveVariables(sql, variables);

      // Detect unresolved variables
      const unresolvedVariables = findUnresolvedVariables(resolvedSql);

      // Parse the GraphQL input
      const request = parseGraphQLInput(resolvedSql);

      // Determine endpoint
      const endpoint = this._config.ENDPOINT;
      if (!endpoint) {
        return { ok: false, error: "No ENDPOINT configured. Set the GraphQL endpoint URL in the connection settings." };
      }

      // Merge default headers from connection config
      const mergedHeaders = { ...(this._config.headers || {}), ...request.headers };
      request.headers = mergedHeaders;

      // Execute the GraphQL request
      const response = await executeGraphQL(request, endpoint);

      // Build result row
      const resultRow: Record<string, any> = {
        data: response.bodyParsed?.data,
        errors: response.bodyParsed?.errors,
        extensions: response.bodyParsed?.extensions,
      };

      return {
        ok: true,
        raw: [resultRow],
        meta: {
          isGraphQL: true,
          status: response.status,
          statusText: response.statusText,
          timing: response.timing,
          size: response.size,
          responseHeaders: response.headers,
          responseBody: response.body,
          responseBodyParsed: response.bodyParsed,
          graphqlData: response.bodyParsed?.data,
          graphqlErrors: response.bodyParsed?.errors,
          graphqlExtensions: response.bodyParsed?.extensions,
          requestEndpoint: endpoint,
          requestQuery: request.query,
          requestVariables: request.variables,
          requestOperationName: request.operationName,
          requestHeaders: request.headers,
          unresolvedVariables,
        },
      };
    } catch (error: any) {
      console.error("GraphQLDataAdapter:execute", error);
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
