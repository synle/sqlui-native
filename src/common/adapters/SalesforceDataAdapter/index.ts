import Connection from "jsforce/lib/connection";
import BaseDataAdapter, { MAX_CONNECTION_TIMEOUT } from "src/common/adapters/BaseDataAdapter/index";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/**
 * Parses an SFDC connection string into login credentials.
 * Format: sfdc://{"username":"...","password":"...","securityToken":"...","loginUrl":"..."}
 * Uses JSON to avoid URL encoding issues with special characters in passwords.
 * @param connectionOption - The raw connection string URI.
 * @returns Parsed credentials with username, password, securityToken, and loginUrl.
 */
function parseSfdcConnectionString(connectionOption: string) {
  const withoutScheme = connectionOption.replace(/^sfdc:\/\//, "");

  try {
    const parsed = JSON.parse(withoutScheme);
    let loginUrl = (parsed.loginUrl || "login.salesforce.com").replace(/\/+$/, "");
    if (loginUrl && !loginUrl.startsWith("http")) {
      loginUrl = `https://${loginUrl}`;
    }

    return {
      username: parsed.username || "",
      password: parsed.password || "",
      securityToken: parsed.securityToken || "",
      loginUrl,
      clientId: parsed.clientId || "",
      clientSecret: parsed.clientSecret || "",
    };
  } catch (_err) {
    // not valid JSON
  }

  throw new Error(
    'Invalid SFDC connection string. Expected format: sfdc://{"username":"...","password":"...","securityToken":"...","loginUrl":"..."}',
  );
}

/**
 * Rewrites Salesforce error messages to be more user-friendly with actionable guidance.
 * @param err - The original error from jsforce.
 * @returns A clear, actionable error message string.
 */
function getSfdcErrorMessage(err: any): string {
  const msg = err?.message || err?.toString() || JSON.stringify(err);

  if (msg.includes("SOAP API login() is disabled")) {
    return [
      "SOAP API login is disabled in this Salesforce org.",
      "",
      "To fix this, go to Salesforce Setup:",
      '  1. Search "SOAP API" in Quick Find',
      '  2. Enable "SOAP API Login Allowed"',
      "",
      "Or enable it on your user profile:",
      "  1. Setup > Users > Profiles > [Your Profile]",
      '  2. Under Administrative Permissions, check "SOAP API Login Allowed"',
      "",
      "Alternatively, provide a Connected App for OAuth2 login by adding",
      '"clientId" and "clientSecret" to your connection JSON.',
    ].join("\n");
  }

  if (msg.includes("INVALID_LOGIN")) {
    return [
      "Invalid login credentials.",
      "",
      "Please check:",
      "  - Username is your Salesforce username (email format), not your actual email",
      "  - Password is correct",
      "  - Security token is appended (get it from Setup > My Personal Information > Reset My Security Token)",
      '  - Login URL is correct (use "login.salesforce.com" for production, "test.salesforce.com" for sandbox)',
    ].join("\n");
  }

  if (msg.includes("LOGIN_MUST_USE_SECURITY_TOKEN")) {
    return [
      "Security token required.",
      "",
      "Your IP is not whitelisted. Add your security token:",
      "  1. Go to Salesforce Setup > My Personal Information > Reset My Security Token",
      "  2. Check your email for the new token",
      '  3. Add it to the "securityToken" field in your connection string',
    ].join("\n");
  }

  return msg;
}

/**
 * Recursively cleans Salesforce `attributes` metadata from query result records.
 * Handles nested relationship objects (e.g., Account.Owner) that also contain attributes.
 * @param obj - A Salesforce record or nested object to clean.
 * @returns The cleaned object without `attributes` keys.
 */
function cleanSalesforceRecord(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanSalesforceRecord);
  }

  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    if (key === "attributes") {
      continue;
    }
    cleaned[key] = cleanSalesforceRecord(obj[key]);
  }
  return cleaned;
}

/**
 * Data adapter for Salesforce (SFDC) connections using the jsforce library.
 * Maps Salesforce concepts: Org -> Database, SObject -> Table, Field -> Column.
 * Supports SOQL/SOSL queries for reads and conn.sobject() API for mutations.
 */
export default class SalesforceDataAdapter extends BaseDataAdapter implements IDataAdapter {
  private _connection?: Connection;

  /**
   * Establishes and caches a jsforce connection to Salesforce.
   * @returns A connected jsforce Connection instance.
   */
  private async getConnection(): Promise<Connection> {
    return new Promise<Connection>(async (resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Connection timeout — check your login URL and network")), MAX_CONNECTION_TIMEOUT);
      try {
        const { username, password, securityToken, loginUrl, clientId, clientSecret } = parseSfdcConnectionString(this.connectionOption);

        const connOptions: any = { loginUrl };

        // Use OAuth2 username-password flow when clientId is provided
        if (clientId) {
          connOptions.oauth2 = {
            loginUrl,
            clientId,
            clientSecret: clientSecret || undefined,
          };
        }

        const conn = new Connection(connOptions);
        await conn.login(username, password + securityToken);

        clearTimeout(timer);
        this._connection = conn;
        resolve(conn);
      } catch (err: any) {
        clearTimeout(timer);
        console.error("SalesforceDataAdapter:getConnection", err);
        reject(new Error(getSfdcErrorMessage(err)));
      }
    });
  }

  /** Closes the Salesforce connection held by this adapter. */
  async disconnect() {
    try {
      await this._connection?.logout();
    } catch (err) {
      console.error("SalesforceDataAdapter:disconnect", err);
    }
    this._connection = undefined;
  }

  /** Authenticates by establishing a Salesforce connection. */
  async authenticate() {
    await this.getConnection();
  }

  /**
   * Returns a single "database" representing the Salesforce org.
   * Salesforce doesn't have multiple databases — each connection is one org.
   * @returns Array with a single database metadata entry named with the org ID.
   */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const conn = await this.getConnection();
    const identity = await conn.identity();
    const orgName = identity.organization_id || "Salesforce Org";

    return [
      {
        name: orgName,
        tables: [],
      },
    ];
  }

  /**
   * Retrieves all queryable SObjects as "tables" from the Salesforce org.
   * @param _database - Unused; Salesforce has a single org per connection.
   * @returns Array of table metadata for each queryable SObject.
   */
  async getTables(_database?: string): Promise<SqluiCore.TableMetaData[]> {
    const conn = await this.getConnection();
    const globalDescribe = await conn.describeGlobal();

    return globalDescribe.sobjects
      .filter((obj: any) => obj.queryable)
      .map((obj: any) => ({
        name: obj.name,
        columns: [],
      }));
  }

  /**
   * Retrieves field metadata for a given SObject using the Salesforce describe API.
   * @param table - The SObject API name (e.g., "Account", "Contact").
   * @param _database - Unused; Salesforce has a single org per connection.
   * @returns Array of column metadata with Salesforce field types.
   */
  async getColumns(table: string, _database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    const conn = await this.getConnection();
    const describe = await conn.sobject(table).describe();

    return describe.fields.map((field: any) => ({
      name: field.name,
      type: field.type,
      primaryKey: field.name === "Id",
      allowNull: field.nillable,
      comment: field.label,
    }));
  }

  /**
   * Executes a query against the Salesforce org. Supports three modes:
   * 1. **SOQL** - Queries starting with SELECT (read-only)
   * 2. **SOSL** - Queries starting with FIND (search)
   * 3. **JS API** - Queries containing `conn.` are eval'd for DML operations (create, update, delete, upsert, describe)
   * @param sql - The SOQL/SOSL query or JS API expression to execute.
   * @param _database - Unused; Salesforce has a single org per connection.
   * @param _table - Unused; table is determined by the query.
   * @returns The query result with records or error information.
   */
  async execute(sql: string, _database?: string, _table?: string): Promise<SqluiCore.Result> {
    const conn = await this.getConnection(); // eslint-disable-line @typescript-eslint/no-unused-vars

    try {
      const trimmed = sql.trim();

      // Mode 1: JS API mode (conn.sobject(...).create/update/delete/etc.)
      if (trimmed.includes("conn.")) {
        //@ts-ignore
        const res: any = await eval(trimmed); // eslint-disable-line no-eval

        // Handle array results (e.g., bulk operations)
        if (Array.isArray(res)) {
          return {
            ok: true,
            raw: res,
          };
        }

        // Handle DML results with success/id/errors pattern
        if (res && typeof res === "object" && "success" in res) {
          return {
            ok: true,
            raw: [res],
            affectedRows: res.success ? 1 : 0,
          };
        }

        // Handle describe results
        if (res && typeof res === "object" && res.fields) {
          return {
            ok: true,
            raw: res.fields.map((f: any) => ({
              name: f.name,
              label: f.label,
              type: f.type,
              length: f.length,
              nillable: f.nillable,
              unique: f.unique,
            })),
          };
        }

        // Handle query results from conn.query()
        if (res && res.records) {
          return {
            ok: true,
            raw: cleanSalesforceRecord(res.records),
            meta: { totalSize: res.totalSize, done: res.done },
          };
        }

        // Generic result
        return {
          ok: true,
          raw: res ? [].concat(res) : [],
          meta: res,
        };
      }

      // Mode 2: SOSL search (FIND { ... })
      if (trimmed.toUpperCase().startsWith("FIND")) {
        const result: any = await conn.search(trimmed);
        const records = result.searchRecords || result;
        return {
          ok: true,
          raw: cleanSalesforceRecord(Array.isArray(records) ? records : [records]),
          meta: {
            totalSize: Array.isArray(records) ? records.length : 1,
          },
        };
      }

      // Mode 3: SOQL query (SELECT ...)
      const result: any = await conn.query(trimmed);

      if (result.records) {
        return {
          ok: true,
          raw: cleanSalesforceRecord(result.records),
          meta: {
            totalSize: result.totalSize,
            done: result.done,
          },
        };
      }

      return {
        ok: true,
        meta: result,
      };
    } catch (err: any) {
      console.error("SalesforceDataAdapter:execute", err);
      return {
        ok: false,
        error: err?.message || err?.toString() || JSON.stringify(err),
      };
    }
  }
}
