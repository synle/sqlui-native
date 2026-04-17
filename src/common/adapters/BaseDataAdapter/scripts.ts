import IDataScript from "src/common/adapters/IDataScript";
import { SqlAction, SqluiCore } from "typings";

/**
 * Returns a divider action output used to visually separate script groups in the UI.
 * @returns A divider action output.
 */
export function getDivider(): SqlAction.Output {
  return {
    label: "divider",
    skipGuide: true,
  };
}

/**
 * Abstract base class providing default implementations for IDataScript methods.
 * Dialect-specific script classes extend this to override behavior as needed.
 */
export default abstract class BaseDataScript implements IDataScript {
  /** List of dialect identifiers supported by this script implementation. */
  dialects: string[] = [];

  /**
   * Checks whether the given dialect is in this script's supported dialects list.
   * @param dialect - The dialect identifier to check.
   * @returns True if the dialect is supported.
   */
  isDialectSupported(dialect?: string) {
    return !!dialect && this.dialects.indexOf(dialect) >= 0;
  }

  /**
   * Returns connection form input fields for the connection helper dialog.
   * @param _dialect - The specific dialect (used by multi-dialect scripts to customize fields).
   */
  getConnectionFormInputs(_dialect?: string) {
    return [
      ["username", "Username"],
      ["password", "Password"],
      ["host", "Host"],
      ["port", "Port", "optional"],
    ];
  }

  /**
   * Returns the connection string format used by the connection helper form.
   * "url" (default) builds `scheme://user:pass@host:port`.
   * "json" builds `scheme://{"field1":"val1","field2":"val2"}` from form fields.
   * "ado" is ADO.NET-style `scheme://Key1=val1;Key2=val2` (Azure Table Storage, CosmosDB).
   * Override in subclasses that use non-URL connection strings.
   */
  getConnectionStringFormat(): "url" | "json" | "ado" {
    return "url";
  }

  /** Returns false by default; override if queries require a table ID. */
  getIsTableIdRequiredForQuery() {
    return false;
  }

  /** Returns the default editor syntax mode ("sql"). */
  getSyntaxMode() {
    return "sql";
  }

  /** Returns false by default; override if this dialect supports migration. */
  supportMigration() {
    return false;
  }

  /** Returns false by default; override if this dialect supports the create record form. */
  supportCreateRecordForm() {
    return false;
  }

  /** Returns false by default; override if this dialect supports the edit record form. */
  supportEditRecordForm() {
    return false;
  }

  /** Returns false by default; override if this dialect supports visualization. */
  supportVisualization() {
    return false;
  }

  /** Returns false by default; override if this dialect manages its own databases/tables (e.g., REST API). */
  supportManagedMetadata() {
    return false;
  }

  /**
   * Returns the dialect type if it is in the supported dialects list.
   * @param dialect - The dialect to check.
   * @returns The dialect if supported, otherwise undefined.
   */
  getDialectType(dialect?: SqluiCore.Dialect) {
    // attempt to return the first item in the dialects / schemes
    if (dialect && this.dialects.indexOf(dialect) >= 0) {
      return dialect as SqluiCore.Dialect;
    }

    return undefined;
  }

  /**
   * Returns the display name for a dialect with the first letter capitalized.
   * @param dialect - The dialect identifier.
   */
  getDialectName(dialect?: SqluiCore.Dialect): string {
    // capitalize the first letter
    return (dialect || "").replace(/^\w/, (c) => c.toUpperCase());
  }

  /**
   * Returns the icon for a dialect. Override in subclasses to provide dialect-specific icons.
   * @param dialect - The dialect identifier.
   */
  getDialectIcon(_dialect?: SqluiCore.Dialect): string {
    return "";
  }

  /** Returns table-level action script generators. Override to provide dialect-specific scripts. */
  getTableScripts(): SqlAction.TableActionScriptGenerator[] {
    return [];
  }

  /** Returns database-level action script generators. Override to provide dialect-specific scripts. */
  getDatabaseScripts(): SqlAction.DatabaseActionScriptGenerator[] {
    return [];
  }

  /** Returns connection-level action script generators. Override to provide dialect-specific scripts. */
  getConnectionScripts(): SqlAction.ConnectionActionScriptGenerator[] {
    return [];
  }

  /**
   * Returns a sample connection string for the given dialect. Override to provide examples.
   * @param dialect - The dialect identifier.
   */
  getSampleConnectionString(_dialect?: SqluiCore.Dialect) {
    return "";
  }

  /**
   * Returns an HTML string with setup instructions for the connection form.
   * Default shows the sample connection string. Override for dialect-specific guides.
   * @param dialect - The dialect identifier.
   */
  getConnectionSetupGuide(dialect?: SqluiCore.Dialect): string {
    const sample = this.getSampleConnectionString(dialect);
    if (!sample) {
      return "";
    }
    return `<strong>Expected format:</strong> <code>${sample}</code>`;
  }

  /**
   * Returns a sample SELECT query for a given table. Override to provide dialect-specific queries.
   * @param actionInput - The table input with dialect, table, and column info.
   */
  getSampleSelectQuery(_actionInput: SqlAction.TableInput): SqlAction.Output | undefined {
    return undefined;
  }

  /**
   * Generates a code snippet for a given language. Override to provide dialect-specific snippets.
   * @param connection - The connection properties.
   * @param query - The query to generate a snippet for.
   * @param language - The target programming language (javascript, python, java).
   */
  getCodeSnippet(connection: SqluiCore.ConnectionProps, query: SqluiCore.ConnectionQuery, language: SqluiCore.LanguageMode) {
    switch (language) {
      case "javascript":
        // TODO: implement me
        return "";
      case "python":
        // TODO: implement me
        return "";
      case "java":
        // TODO: implement me
        return "";
      default:
        return "";
    }
  }
}
