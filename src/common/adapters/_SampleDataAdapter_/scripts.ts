import BaseDataScript, { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
// TODO: replace with the actual path to your dialect icon PNG
// import mydbIcon from "src/common/adapters/MyDbDataAdapter/mydb.png";
import { SqlAction, SqluiCore } from "typings";

/**
 * Formatter determines syntax highlighting in the query editor.
 * Use "sql" for SQL-based dialects, "js" or "javascript" for JS-based dialects (e.g., MongoDB, Redis).
 */
const formatter = "sql";

// ─── Table Action Script Generators ──────────────────────────────────────────
// Each function below generates a pre-built query template shown in the UI's
// table action dropdown. The `input` parameter carries context (database, table, columns).

/**
 * Generates a SELECT query to fetch all rows from a table.
 * This is typically the most common table action.
 */
export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  // TODO: replace with your dialect's select syntax
  return {
    label,
    formatter,
    query: `SELECT * FROM ${input.tableId} LIMIT ${input.querySize}`,
  };
}

// ─── Database Action Script Generators ───────────────────────────────────────
// These appear in the database-level action dropdown in the sidebar.

export function getCreateDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Database`;

  // TODO: replace with your dialect's create database syntax
  return {
    label,
    formatter,
    query: `CREATE DATABASE new_database_name`,
  };
}

export function getDropDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Database`;

  // TODO: replace with your dialect's drop database syntax
  return {
    label,
    formatter,
    query: `DROP DATABASE ${input.databaseId}`,
  };
}

/**
 * SampleDataScripts - Script generator template for new dialects.
 *
 * This class registers which dialect(s) it supports and provides:
 *   - Pre-built query templates for table/database/connection actions
 *   - Sample connection strings for the "new connection" form
 *   - Code snippets for exporting queries to JavaScript, Python, or Java
 *
 * To use this template:
 *   1. Replace the dialect string in `dialects` with your dialect identifier (must match typings/index.ts).
 *   2. Implement the script generator functions above.
 *   3. Wire them into getTableScripts() and getDatabaseScripts() below.
 */
export class ConcreteDataScripts extends BaseDataScript {
  // Must match the dialect string(s) registered in typings/index.ts.
  // Use multiple entries if your adapter handles variants (e.g., ["redis", "rediss"]).
  dialects = ["your_dialect_name"];

  // ─── Dialect Icon ─────────────────────────────────────────────────────────
  // Return the imported icon asset. Webpack resolves the import to a URL string.
  // TODO: uncomment and update the import above, then uncomment this method.
  // getDialectIcon() {
  //   return mydbIcon;
  // }

  // ─── Feature Flags ───────────────────────────────────────────────────────
  // Return true to enable optional UI features for this dialect.

  /** Whether this dialect supports data migration (import/export between dialects). */
  supportMigration() {
    return false;
  }

  /** Whether the "Create Record" form is available for this dialect. */
  supportCreateRecordForm() {
    return false;
  }

  /** Whether the "Edit Record" form is available for this dialect. */
  supportEditRecordForm() {
    return false;
  }

  /** Whether chart/visualization is supported for query results. */
  supportVisualization() {
    return false;
  }

  // ─── Script Registrations ────────────────────────────────────────────────
  // Return arrays of script generator functions. Use getDivider() between groups.

  /** Scripts shown in the table-level action dropdown. */
  getTableScripts() {
    return [
      getSelectAllColumns,
      // TODO: add more table scripts here, use getDivider() to separate groups
    ];
  }

  /** Scripts shown in the database-level action dropdown. */
  getDatabaseScripts() {
    return [
      getCreateDatabase,
      getDivider,
      getDropDatabase,
      // TODO: add more database scripts here
    ];
  }

  /** Scripts shown in the connection-level action dropdown. */
  getConnectionScripts() {
    return [];
  }

  // ─── Connection & Query Samples ──────────────────────────────────────────

  /**
   * Sample connection string shown as placeholder text in the "new connection" form.
   * Must use the dialect prefix that matches your dialect name.
   */
  getSampleConnectionString(dialect?: SqluiCore.Dialect) {
    return `your_dialect_name://username:password@localhost:port`;
  }

  /**
   * Default SELECT query auto-filled when a user selects a table.
   * Return undefined if not applicable (e.g., key-value stores).
   */
  getSampleSelectQuery(input: SqlAction.TableInput) {
    return getSelectAllColumns(input);
  }

  // ─── Code Snippets ──────────────────────────────────────────────────────
  // Generate copy-pasteable code for the "Export as Code" feature.
  // See src/common/adapters/code-snippets/ for the renderCodeSnippet helper
  // and existing Mustache templates.

  getCodeSnippet(connection: SqluiCore.ConnectionProps, query: SqluiCore.ConnectionQuery, language: SqluiCore.LanguageMode) {
    switch (language) {
      case "javascript":
        // TODO: return a runnable JS code snippet
        // Example: return renderCodeSnippet('javascript', 'your_dialect', { sql });
        return "";
      case "python":
        // TODO: return a runnable Python code snippet
        return "";
      case "java":
        // TODO: return a runnable Java code snippet
        return "";
      default:
        return "";
    }
  }
}

export default new ConcreteDataScripts();
