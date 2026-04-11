/** Script generator for the GraphQL dialect — query and mutation templates. */

import BaseDataScript, { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import { renderCodeSnippet } from "src/common/adapters/code-snippets/renderCodeSnippet";
import graphqlIcon from "src/common/adapters/GraphQLDataAdapter/graphql-logo.png";
import { SqlAction, SqluiCore } from "typings";

/** Formatter hint for GraphQL syntax highlighting. */
const graphqlFormatter = "graphql";

// ============================================================
// Table-Level Scripts (Query/Mutation Templates)
// ============================================================

/**
 * Generates a simple GraphQL query template.
 * @param _input - Table input (unused).
 * @returns Script output with a basic query.
 */
export function getSimpleQuery(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Simple Query",
    formatter: graphqlFormatter,
    query: `{
  __typename
}`,
  };
}

/**
 * Generates a query with variables template.
 * @param _input - Table input (unused).
 * @returns Script output with query and variables section.
 */
export function getQueryWithVariables(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Query with Variables",
    formatter: graphqlFormatter,
    query: `query GetItems($limit: Int, $offset: Int) {
  items(limit: $limit, offset: $offset) {
    id
    name
  }
}

### Variables
{"limit": 10, "offset": 0}`,
  };
}

/**
 * Generates a query with headers template.
 * @param _input - Table input (unused).
 * @returns Script output with query and headers section.
 */
export function getQueryWithHeaders(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Query with Headers",
    formatter: graphqlFormatter,
    query: `{
  viewer {
    id
    name
  }
}

### Headers
Authorization: Bearer {{ACCESS_TOKEN}}`,
  };
}

/**
 * Generates a list/search query template with filtering and pagination.
 * @param _input - Table input (unused).
 * @returns Script output with a search query.
 */
export function getSearchQuery(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Search / List Query",
    formatter: graphqlFormatter,
    query: `query SearchItems($filter: String, $limit: Int, $offset: Int) {
  items(filter: $filter, limit: $limit, offset: $offset) {
    id
    name
    createdAt
  }
}

### Variables
{"filter": "", "limit": 10, "offset": 0}`,
  };
}

/**
 * Generates a create mutation template.
 * @param _input - Table input (unused).
 * @returns Script output with a create mutation and variables.
 */
export function getCreateMutation(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Create Mutation",
    formatter: graphqlFormatter,
    query: `mutation CreateItem($input: CreateItemInput!) {
  createItem(input: $input) {
    id
    name
    createdAt
  }
}

### Variables
{"input": {"name": "New Item"}}`,
  };
}

/**
 * Generates an update mutation template.
 * @param _input - Table input (unused).
 * @returns Script output with an update mutation and variables.
 */
export function getUpdateMutation(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Update Mutation",
    formatter: graphqlFormatter,
    query: `mutation UpdateItem($id: ID!, $input: UpdateItemInput!) {
  updateItem(id: $id, input: $input) {
    id
    name
    updatedAt
  }
}

### Variables
{"id": "123", "input": {"name": "Updated Item"}}`,
  };
}

/**
 * Generates a delete mutation template.
 * @param _input - Table input (unused).
 * @returns Script output with a delete mutation and variables.
 */
export function getDeleteMutation(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Delete Mutation",
    formatter: graphqlFormatter,
    query: `mutation DeleteItem($id: ID!) {
  deleteItem(id: $id) {
    id
    success
  }
}

### Variables
{"id": "123"}`,
  };
}

/**
 * Generates a subscription template.
 * @param _input - Table input (unused).
 * @returns Script output with a subscription example.
 */
export function getSubscription(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Subscription",
    formatter: graphqlFormatter,
    query: `subscription OnItemCreated {
  itemCreated {
    id
    name
    createdAt
  }
}`,
  };
}

/**
 * Generates a full introspection query for exploring the schema.
 * @param _input - Table input (unused).
 * @returns Script output with the standard introspection query.
 */
export function getIntrospectionQuery(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Introspection (Full Schema)",
    formatter: graphqlFormatter,
    query: `{
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      name
      kind
      description
      fields {
        name
        type {
          name
          kind
          ofType { name kind }
        }
      }
    }
  }
}`,
  };
}

/**
 * Generates a lightweight introspection query listing only type names.
 * @param _input - Table input (unused).
 * @returns Script output with a types-only introspection query.
 */
export function getIntrospectionTypesOnly(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  return {
    label: "Introspection (Types Only)",
    formatter: graphqlFormatter,
    query: `{
  __schema {
    types {
      name
      kind
    }
  }
}`,
  };
}

// ============================================================
// Script class
// ============================================================

/** Script generator for the GraphQL dialect. */
export class ConcreteDataScripts extends BaseDataScript {
  /** Supported dialect identifier for GraphQL. */
  dialects = ["graphql"];

  /** Returns connection form inputs — ENDPOINT and collection-level variables. */
  getConnectionFormInputs() {
    return [
      ["ENDPOINT", "GraphQL Endpoint URL", "required"],
      ["variables", "Variables (JSON array)", "optional"],
    ];
  }

  /** Returns "json" because GraphQL uses JSON-based connection strings. */
  getConnectionStringFormat(): "url" | "json" | "ado" {
    return "json";
  }

  /** Returns false — table ID is not required for executing GraphQL queries. */
  getIsTableIdRequiredForQuery() {
    return false;
  }

  /** Returns "graphql" syntax mode for Monaco editor highlighting. */
  getSyntaxMode() {
    return "graphql";
  }

  /** Returns false — GraphQL does not support data migration. */
  supportMigration() {
    return false;
  }

  /** Returns true — GraphQL manages its own databases (folders) and tables (saved queries). */
  supportManagedMetadata() {
    return true;
  }

  /** Returns false — GraphQL does not use create record forms. */
  supportCreateRecordForm() {
    return false;
  }

  /** Returns false — GraphQL does not use edit record forms. */
  supportEditRecordForm() {
    return false;
  }

  /** Returns false — GraphQL does not support visualization. */
  supportVisualization() {
    return false;
  }

  /**
   * Returns the canonical "graphql" dialect type.
   * @param _dialect - The raw dialect string.
   * @returns The "graphql" dialect identifier.
   */
  getDialectType(_dialect) {
    return "graphql" as SqluiCore.Dialect;
  }

  /**
   * Returns the display name "GraphQL" for this dialect.
   * @param _dialect - The dialect string (unused).
   * @returns The "GraphQL" display name.
   */
  getDialectName(_dialect) {
    return "GraphQL";
  }

  /**
   * Returns the GraphQL dialect icon asset.
   * @param _dialect - The dialect string (unused).
   * @returns The GraphQL logo image.
   */
  getDialectIcon(_dialect) {
    return graphqlIcon;
  }

  /**
   * Returns table-level script generators for GraphQL query/mutation templates.
   * @returns Array of template generators.
   */
  getTableScripts() {
    return [
      getSimpleQuery,
      getQueryWithVariables,
      getQueryWithHeaders,
      getSearchQuery,
      getDivider,
      getCreateMutation,
      getUpdateMutation,
      getDeleteMutation,
      getDivider,
      getSubscription,
      getDivider,
      getIntrospectionQuery,
      getIntrospectionTypesOnly,
    ];
  }

  /** Returns empty array — no database-level scripts for GraphQL. */
  getDatabaseScripts() {
    return [];
  }

  /** Returns empty array — no connection-level scripts for GraphQL. */
  getConnectionScripts() {
    return [];
  }

  /**
   * Returns a sample GraphQL connection string.
   * @param _dialect - The dialect identifier.
   * @returns A sample graphql:// connection string.
   */
  getSampleConnectionString(_dialect) {
    return `graphql://{"ENDPOINT":"https://countries.trevorblades.com/graphql","variables":[]}`;
  }

  /** Returns GraphQL setup guide HTML. */
  getConnectionSetupGuide(): string {
    return `
      <strong>GraphQL API Setup</strong>
      <ol>
        <li><strong>Connection String</strong> -- Use <code>graphql://{"ENDPOINT":"https://your-api.com/graphql"}</code> to set the endpoint.</li>
        <li><strong>Headers</strong> -- Add default headers (e.g., Authorization) in the connection form. They are sent with every request.</li>
        <li><strong>Variables</strong> -- Define <code>{{ACCESS_TOKEN}}</code>, etc. at collection level. Override per folder.</li>
        <li><strong>Editor Format</strong> -- Write GraphQL queries directly. Use <code>### Variables</code>, <code>### Headers</code>, and <code>### Operation</code> sections for additional request data.</li>
      </ol>
    `;
  }

  /**
   * Returns a sample query for the given table input.
   * @param tableActionInput - The table context for generating the sample.
   * @returns Script output with a simple GraphQL query.
   */
  getSampleSelectQuery(tableActionInput) {
    return getSimpleQuery(tableActionInput);
  }

  /**
   * Generates a connection code snippet for the given language.
   * @param _connection - The connection properties (unused).
   * @param query - The query context containing the GraphQL editor content.
   * @param language - The target language.
   * @returns A code snippet string.
   */
  getCodeSnippet(_connection, query, language) {
    const cmd = query.sql || "";
    if (!cmd.trim()) {
      return "";
    }

    try {
      // Parse the GraphQL input to extract query/variables/operationName/headers
      const { parseGraphQLInput } = require("src/common/adapters/GraphQLDataAdapter/graphqlParser");
      const parsed = parseGraphQLInput(cmd);
      const mergedHeaders = { "Content-Type": "application/json", ...parsed.headers };
      const hasVariables = parsed.variables && Object.keys(parsed.variables).length > 0;
      const context = {
        endpoint: "{{ENDPOINT}}",
        query: parsed.query,
        queryEscaped: parsed.query.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n"),
        hasVariables,
        variablesJson: hasVariables ? JSON.stringify(parsed.variables, null, 2) : undefined,
        variablesEscaped: hasVariables ? JSON.stringify(JSON.stringify(parsed.variables)).slice(1, -1) : undefined,
        operationName: parsed.operationName,
        headers: mergedHeaders,
        headersJson: JSON.stringify(mergedHeaders, null, 2),
        headerLines: Object.entries(mergedHeaders).map(([key, value]) => ({ key, value })),
      };
      return renderCodeSnippet(language as any, "graphql" as any, context);
    } catch (_err) {
      // Fallback to raw query if parsing fails
      return `// Original query:\n// ${cmd.replace(/\n/g, "\n// ")}`;
    }
  }
}

export default new ConcreteDataScripts();
