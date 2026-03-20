import BaseDataScript, { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import { renderCodeSnippet } from "src/common/adapters/code-snippets/renderCodeSnippet";
import salesforceIcon from "src/common/adapters/SalesforceDataAdapter/salesforce.png";
import { SqlAction, SqluiCore } from "typings";

/** Prefix used for Salesforce jsforce connection variable in generated scripts. */
export const SFDC_ADAPTER_PREFIX = "conn";

const soqlFormatter = "sql";
const jsFormatter = "js";

// ============================================================
// SOQL Query Templates (Read-Only)
// ============================================================

/**
 * Generates a SOQL query to select all fields from an SObject.
 * @param input - Table input containing the SObject name, columns, and query size.
 * @returns Script output with the SOQL SELECT query.
 */
export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  const columns = input.columns;
  const columnNames = columns && columns.length > 0 ? columns.map((c) => c.name).join(", ") : "Id, Name";

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT ${columnNames} FROM ${input.tableId} LIMIT ${input.querySize}`,
  };
}

/**
 * Generates a SOQL query to select a single record by Id.
 * @param input - Table input containing the SObject name.
 * @returns Script output with the SOQL SELECT ... WHERE Id query.
 */
export function getSelectById(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select By Id`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT Id, Name FROM ${input.tableId} WHERE Id = 'some_record_id' LIMIT 1`,
  };
}

/**
 * Generates a SOQL query to select specific columns with a WHERE clause.
 * @param input - Table input containing columns and query size.
 * @returns Script output with filtered SOQL query, or undefined if no columns.
 */
export function getSelectSpecificColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  if (!input.columns) {
    return undefined;
  }

  const columns = input.columns.filter((c) => !c.name.endsWith("__r")).slice(0, 5);
  const columnNames = columns.map((c) => c.name).join(", ");
  const firstStringCol = columns.find((c) => c.type === "string" || c.type === "textarea");
  const whereClause = firstStringCol ? `WHERE ${firstStringCol.name} != null` : "";

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT ${columnNames} FROM ${input.tableId} ${whereClause} LIMIT ${input.querySize}`,
  };
}

/**
 * Generates a SOQL COUNT() query for an SObject.
 * @param input - Table input containing the SObject name.
 * @returns Script output with the COUNT query.
 */
export function getCount(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Count Records`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT COUNT() FROM ${input.tableId}`,
  };
}

/**
 * Generates a SOQL query with GROUP BY for aggregate analysis.
 * @param input - Table input containing columns.
 * @returns Script output with GROUP BY query, or undefined if no suitable columns.
 */
export function getGroupBy(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Group By`;

  if (!input.columns) {
    return undefined;
  }

  const picklistCol = input.columns.find((c) => c.type === "picklist");
  const groupByCol = picklistCol ? picklistCol.name : "Type";

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT ${groupByCol}, COUNT(Id) cnt FROM ${input.tableId} GROUP BY ${groupByCol} ORDER BY COUNT(Id) DESC`,
  };
}

/**
 * Generates a SOQL query to search by Name field.
 * @param input - Table input containing the SObject name and query size.
 * @returns Script output with the Name search query.
 */
export function getSearchByName(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Search By Name (SOQL)`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT Id, Name FROM ${input.tableId} WHERE Name LIKE '%keyword%' LIMIT ${input.querySize}`,
  };
}

/**
 * Generates a SOQL query to select recently created records.
 * @param input - Table input containing the SObject name and query size.
 * @returns Script output with the ORDER BY CreatedDate query.
 */
export function getRecentRecords(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Recent Records`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT Id, Name, CreatedDate, LastModifiedDate FROM ${input.tableId} ORDER BY CreatedDate DESC LIMIT ${input.querySize}`,
  };
}

/**
 * Generates a SOQL query with a date filter (records from the last 7 days).
 * @param input - Table input containing the SObject name and query size.
 * @returns Script output with the date-filtered SOQL query.
 */
export function getSelectByDate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select By Date Range`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT Id, Name, CreatedDate FROM ${input.tableId} WHERE CreatedDate = LAST_N_DAYS:7 LIMIT ${input.querySize}`,
  };
}

/**
 * Generates a SOQL query with a subquery for related child records.
 * @param input - Table input containing the SObject name and query size.
 * @returns Script output with a nested relationship SOQL query.
 */
export function getSubquery(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Subquery (Child Records)`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT Id, Name, (SELECT Id, Name FROM Contacts) FROM ${input.tableId} LIMIT ${input.querySize}`,
    description: "Modify the subquery to match your object's child relationships",
  };
}

/**
 * Generates a SOQL query to describe an SObject's metadata via FieldDefinition.
 * @param input - Table input containing the SObject name.
 * @returns Script output describing the object fields.
 */
export function getDescribeObject(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Describe Object (Fields)`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT QualifiedApiName, DataType, Label FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${input.tableId}' LIMIT 200`,
  };
}

// ============================================================
// SOSL Search Templates
// ============================================================

/**
 * Generates a SOSL FIND query to search across an SObject.
 * @param input - Table input containing the SObject name and query size.
 * @returns Script output with the SOSL FIND query.
 */
export function getSoslSearch(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Search (SOSL)`;

  return {
    label,
    formatter: soqlFormatter,
    query: `FIND {keyword} IN ALL FIELDS RETURNING ${input.tableId}(Id, Name) LIMIT ${input.querySize}`,
  };
}

/**
 * Generates a SOSL FIND query to search across multiple objects at connection level.
 * @param _input - Connection input (unused).
 * @returns Script output with a multi-object SOSL FIND query.
 */
export function getSoslSearchMultiObject(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Search Across Objects (SOSL)`;

  return {
    label,
    formatter: soqlFormatter,
    query: `FIND {keyword} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Name, Email), Lead(Id, Name) LIMIT 20`,
  };
}

// ============================================================
// JS API Templates (Mutations via conn.sobject())
// ============================================================

/**
 * Generates a JS API script to insert a record into an SObject.
 * @param input - Table input containing columns for the insert.
 * @param value - Optional pre-populated values for the new record.
 * @returns Script output with the conn.sobject().create() call.
 */
export function getInsert(input: SqlAction.TableInput, value?: Record<string, any>): SqlAction.Output | undefined {
  const label = `Insert Record (API)`;

  let colMap: any = {};
  if (value) {
    colMap = { ...value };
    delete colMap.Id;
  } else if (input.columns) {
    for (const col of input.columns) {
      if (col.name === "Id" || col.name.endsWith("__r")) {
        continue;
      }
      switch (col.type) {
        case "string":
        case "textarea":
        case "email":
        case "url":
        case "phone":
          colMap[col.name] = "";
          break;
        case "double":
        case "currency":
        case "int":
        case "percent":
          colMap[col.name] = 0;
          break;
        case "boolean":
          colMap[col.name] = false;
          break;
        case "date":
          colMap[col.name] = "2024-01-01";
          break;
        case "datetime":
          colMap[col.name] = "2024-01-01T00:00:00.000Z";
          break;
        default:
          colMap[col.name] = "";
          break;
      }
    }
  } else {
    colMap = { Name: "New Record" };
  }

  return {
    label,
    formatter: jsFormatter,
    query: `${SFDC_ADAPTER_PREFIX}.sobject('${input.tableId}').create(${JSON.stringify(colMap, null, 2)})`,
  };
}

/**
 * Generates a JS API script to bulk insert multiple records.
 * @param input - Table input containing columns.
 * @param rows - Array of row data to insert.
 * @returns Script output with the conn.sobject().create() bulk call.
 */
export function getBulkInsert(input: SqlAction.TableInput, rows?: Record<string, any>[]): SqlAction.Output | undefined {
  const label = `Insert Record (API)`;

  if (!rows || rows.length === 0) {
    return undefined;
  }

  const cleanedRows = rows.map((row) => {
    const cleaned = { ...row };
    delete cleaned.Id;
    return cleaned;
  });

  return {
    label,
    formatter: jsFormatter,
    query: `${SFDC_ADAPTER_PREFIX}.sobject('${input.tableId}').create(${JSON.stringify(cleanedRows, null, 2)})`,
  };
}

/**
 * Generates a JS API script to update a record in an SObject.
 * @param input - Table input containing columns for the update.
 * @returns Script output with the conn.sobject().update() call, or undefined if no columns.
 */
export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update Record (API)`;

  if (!input.columns) {
    return undefined;
  }

  const colMap: any = { Id: "record_id_here" };
  for (const col of input.columns) {
    if (col.name === "Id" || col.name.endsWith("__r")) {
      continue;
    }
    switch (col.type) {
      case "string":
      case "textarea":
      case "email":
      case "url":
      case "phone":
        colMap[col.name] = "new_value";
        break;
      case "double":
      case "currency":
      case "int":
      case "percent":
        colMap[col.name] = 0;
        break;
      case "boolean":
        colMap[col.name] = false;
        break;
      default:
        colMap[col.name] = "";
        break;
    }
  }

  return {
    label,
    formatter: jsFormatter,
    query: `${SFDC_ADAPTER_PREFIX}.sobject('${input.tableId}').update(${JSON.stringify(colMap, null, 2)})`,
  };
}

/**
 * Generates a JS API script to update a record with specific values and conditions.
 * @param input - Table input containing the SObject name.
 * @param value - Field values to set.
 * @param conditions - Conditions identifying the record (must include Id).
 * @returns Script output with the conn.sobject().update() call.
 */
export function getUpdateWithValues(
  input: SqlAction.TableInput,
  value: Record<string, any>,
  conditions: Record<string, any>,
): SqlAction.Output | undefined {
  const label = `Update Record (API)`;

  const updateData = { Id: conditions.Id || "record_id_here", ...value };

  return {
    label,
    formatter: jsFormatter,
    query: `${SFDC_ADAPTER_PREFIX}.sobject('${input.tableId}').update(${JSON.stringify(updateData, null, 2)})`,
  };
}

/**
 * Generates a JS API script to delete a record by Id.
 * @param input - Table input containing the SObject name.
 * @returns Script output with the conn.sobject().destroy() call.
 */
export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete Record (API)`;

  return {
    label,
    formatter: jsFormatter,
    query: `${SFDC_ADAPTER_PREFIX}.sobject('${input.tableId}').destroy('record_id_here')`,
  };
}

/**
 * Generates a JS API script to upsert a record using an external ID field.
 * @param input - Table input containing columns for the upsert.
 * @returns Script output with the conn.sobject().upsert() call, or undefined if no columns.
 */
export function getUpsert(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Upsert Record (API)`;

  if (!input.columns) {
    return undefined;
  }

  const externalIdCol = input.columns.find((c) => c.unique && c.name !== "Id");
  const extIdField = externalIdCol ? externalIdCol.name : "External_Id__c";

  const colMap: any = {};
  colMap[extIdField] = "external_id_value";
  colMap["Name"] = "Record Name";

  return {
    label,
    formatter: jsFormatter,
    query: `${SFDC_ADAPTER_PREFIX}.sobject('${input.tableId}').upsert(${JSON.stringify(colMap, null, 2)}, '${extIdField}')`,
    description: `Upsert using external ID field: ${extIdField}`,
  };
}

/**
 * Generates a JS API script to describe an SObject's metadata via the API.
 * @param input - Table input containing the SObject name.
 * @returns Script output with the conn.sobject().describe() call.
 */
export function getDescribeApi(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Describe Object (API)`;

  return {
    label,
    formatter: jsFormatter,
    query: `${SFDC_ADAPTER_PREFIX}.sobject('${input.tableId}').describe()`,
  };
}

// ============================================================
// Connection-Level Templates
// ============================================================

/**
 * Generates a SOQL query to list all custom objects at the connection level.
 * @param _input - Connection input (unused).
 * @returns Script output listing custom objects.
 */
export function getListCustomObjects(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `List Custom Objects`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT QualifiedApiName, Label, KeyPrefix FROM EntityDefinition WHERE QualifiedApiName LIKE '%__c' ORDER BY QualifiedApiName LIMIT 200`,
  };
}

/**
 * Generates a SOQL query to list all standard objects at the connection level.
 * @param _input - Connection input (unused).
 * @returns Script output listing standard objects.
 */
export function getListStandardObjects(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `List Standard Objects`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT QualifiedApiName, Label, KeyPrefix FROM EntityDefinition WHERE NOT QualifiedApiName LIKE '%__c' ORDER BY QualifiedApiName LIMIT 200`,
  };
}

/**
 * Generates a SOQL query to show current user info.
 * @param _input - Connection input (unused).
 * @returns Script output querying the User object.
 */
export function getCurrentUser(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Current User Info`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT Id, Name, Email, Profile.Name, UserRole.Name FROM User WHERE IsActive = true LIMIT 10`,
  };
}

/**
 * Generates a SOQL query to list recent Accounts.
 * @param _input - Connection input (unused).
 * @returns Script output querying Account records.
 */
export function getRecentAccounts(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Recent Accounts`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT Id, Name, Industry, Phone, CreatedDate FROM Account ORDER BY CreatedDate DESC LIMIT 20`,
  };
}

/**
 * Generates a SOQL query to list recent Contacts.
 * @param _input - Connection input (unused).
 * @returns Script output querying Contact records.
 */
export function getRecentContacts(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Recent Contacts`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT Id, Name, Email, Phone, Account.Name, CreatedDate FROM Contact ORDER BY CreatedDate DESC LIMIT 20`,
  };
}

/**
 * Generates a SOQL query to list recent Opportunities.
 * @param _input - Connection input (unused).
 * @returns Script output querying Opportunity records.
 */
export function getRecentOpportunities(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Recent Opportunities`;

  return {
    label,
    formatter: soqlFormatter,
    query: `SELECT Id, Name, Amount, StageName, CloseDate, Account.Name FROM Opportunity ORDER BY CreatedDate DESC LIMIT 20`,
  };
}

/**
 * Generates a JS API script to get the org identity info.
 * @param _input - Connection input (unused).
 * @returns Script output with the conn.identity() call.
 */
export function getOrgIdentity(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Org Identity (API)`;

  return {
    label,
    formatter: jsFormatter,
    query: `${SFDC_ADAPTER_PREFIX}.identity()`,
  };
}

/**
 * Generates a JS API script to list all SObjects in the org.
 * @param _input - Connection input (unused).
 * @returns Script output with the conn.describeGlobal() call.
 */
export function getDescribeGlobal(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Describe Global (API)`;

  return {
    label,
    formatter: jsFormatter,
    query: `${SFDC_ADAPTER_PREFIX}.describeGlobal()`,
    description: "Returns metadata about all SObjects in the org",
  };
}

/**
 * Generates a JS API script to get org limits.
 * @param _input - Connection input (unused).
 * @returns Script output with the conn.limits() call.
 */
export function getOrgLimits(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Org Limits (API)`;

  return {
    label,
    formatter: jsFormatter,
    query: `${SFDC_ADAPTER_PREFIX}.limits()`,
    description: "Returns API usage limits for the org",
  };
}

// ============================================================
// Script class
// ============================================================

/** Script generator for the Salesforce (SFDC) dialect. */
export class ConcreteDataScripts extends BaseDataScript {
  dialects = ["sfdc"];

  /** Returns connection form inputs for Salesforce with individual fields serialized as JSON. */
  getConnectionFormInputs() {
    return [
      ["username", "Username (Email)"],
      ["password", "Password"],
      ["securityToken", "Security Token", "optional"],
      ["loginUrl", "Login URL (default: login.salesforce.com)", "optional"],
      ["clientId", "Connected App Client ID (for OAuth2)", "optional"],
      ["clientSecret", "Connected App Client Secret (for OAuth2)", "optional"],
    ];
  }

  /** Returns "json" because Salesforce uses JSON-based connection strings. */
  getConnectionStringFormat(): "url" | "json" {
    return "json";
  }

  /** Returns false because table ID is inferred from the SOQL query. */
  getIsTableIdRequiredForQuery() {
    return false;
  }

  /** Returns the SOQL syntax mode for the editor. */
  getSyntaxMode() {
    return "sql";
  }

  /** Returns true because Salesforce supports data migration via the API. */
  supportMigration() {
    return true;
  }

  /** Returns true because Salesforce supports the create record form. */
  supportCreateRecordForm() {
    return true;
  }

  /** Returns false because Salesforce edit requires Id which is handled via API scripts. */
  supportEditRecordForm() {
    return false;
  }

  /**
   * Returns the canonical "sfdc" dialect type.
   * @param _dialect - The raw dialect string.
   * @returns The "sfdc" dialect identifier.
   */
  getDialectType(_dialect) {
    return "sfdc" as SqluiCore.Dialect;
  }

  /**
   * Returns the display name "Salesforce" for this dialect.
   * @param _dialect - The dialect string (unused).
   * @returns The "Salesforce" display name.
   */
  getDialectName(_dialect) {
    return "Salesforce";
  }

  /**
   * Returns the Salesforce dialect icon asset.
   * @param _dialect - The dialect string (unused).
   * @returns The imported Salesforce PNG icon.
   */
  getDialectIcon(_dialect) {
    return salesforceIcon;
  }

  /**
   * Returns the ordered list of table-level script generators for Salesforce.
   * @returns Array of script generator functions for SObject operations.
   */
  getTableScripts() {
    return [
      // SOQL Read
      getSelectAllColumns,
      getSelectSpecificColumns,
      getSelectById,
      getDivider,
      getCount,
      getGroupBy,
      getSearchByName,
      getRecentRecords,
      getSelectByDate,
      getSubquery,
      getDivider,
      // SOSL Search
      getSoslSearch,
      getDivider,
      // JS API Mutations
      getInsert,
      getUpdate,
      getDelete,
      getUpsert,
      getDivider,
      // Metadata
      getDescribeObject,
      getDescribeApi,
    ];
  }

  /**
   * Returns the ordered list of database-level script generators for Salesforce.
   * @returns Empty array — Salesforce org doesn't have database-level operations.
   */
  getDatabaseScripts() {
    return [];
  }

  /**
   * Returns the ordered list of connection-level script generators for Salesforce.
   * @returns Array of script generator functions for org-level operations.
   */
  getConnectionScripts() {
    return [
      getDivider,
      // Common quick queries
      getRecentAccounts,
      getRecentContacts,
      getRecentOpportunities,
      getCurrentUser,
      getDivider,
      // Object discovery
      getListCustomObjects,
      getListStandardObjects,
      getDivider,
      // SOSL
      getSoslSearchMultiObject,
      getDivider,
      // JS API
      getOrgIdentity,
      getDescribeGlobal,
      getOrgLimits,
    ];
  }

  /**
   * Returns a sample SFDC connection string.
   * @param _dialect - The dialect identifier.
   * @returns A sample connection URL string.
   */
  getSampleConnectionString(_dialect) {
    return `sfdc://{"username":"your_username","password":"your_password","securityToken":"your_token","loginUrl":"login.salesforce.com"}`;
  }

  /**
   * Returns a sample SELECT query for the given table input.
   * @param tableActionInput - The table context for which to generate the sample query.
   * @returns Script output with the sample SOQL query.
   */
  getSampleSelectQuery(tableActionInput) {
    return getSelectAllColumns(tableActionInput);
  }

  /**
   * Generates a connection code snippet for the given language.
   * @param connection - The connection metadata including connection string.
   * @param query - The query context including SOQL and database identifier.
   * @param language - The target language ("javascript", "python", or "java").
   * @returns A code snippet string.
   */
  getCodeSnippet(connection, query, language) {
    const sql = query.sql || "";

    switch (language) {
      case "javascript":
        return renderCodeSnippet("javascript", "sfdc", { sql });
      case "python":
        return renderCodeSnippet("python", "sfdc", {
          sql: sql.replace(/'/g, "\\'"),
        });
      case "java":
        return renderCodeSnippet(
          "java",
          "sfdc",
          { sql },
          {
            connectDescription: "Salesforce",
            gradleDep: `    // Salesforce REST API - use HttpClient (built-in since Java 11)`,
            mainJavaComment: `/**
 * src/main/java/Main.java
 *
 * Connects to Salesforce via REST API
 * See: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/
 */`,
          },
        );
      default:
        return ``;
    }
  }
}

export default new ConcreteDataScripts();
