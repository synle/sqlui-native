/** Connection hints and query templates for local structured-text files. */

import BaseDataScript from "src/common/adapters/BaseDataAdapter/scripts";
import fileIcon from "src/common/adapters/FileDataAdapter/file.png";
import { FILE_DATA_DIALECTS } from "src/common/adapters/FileDataAdapter/types";
import { SqlAction, SqluiCore } from "typings";
const DIALECT_NAMES: Partial<Record<SqluiCore.Dialect, string>> = {
  json: "JSON File",
  jsonc: "JSONC File",
  yaml: "YAML File",
  yml: "YAML File",
  toml: "TOML File",
  xml: "XML File",
};

/** Returns the query inserted by the table-level Select JSON command. */
function getSelectJson(_input: SqlAction.TableInput): SqlAction.Output {
  return {
    label: "Select JSON",
    formatter: "js",
    query: "display(res_json);",
  };
}

/** Script definitions for the supported local document dialects. */
export class FileDataAdapterScripts extends BaseDataScript {
  /** Supported URI schemes, including the YAML extension alias. */
  dialects = [...FILE_DATA_DIALECTS];

  /** Returns the shared local-document icon. */
  getDialectIcon(): string {
    return fileIcon;
  }

  /** Provides a filename field for constructing an absolute-path URI. */
  getConnectionFormInputs(_dialect?: string): string[][] {
    return [["filePath", "Absolute file path"]];
  }

  /** Returns a JSON-like query editor mode. */
  getSyntaxMode(): string {
    return "javascript";
  }

  /** Returns the display name for a file-format dialect. */
  getDialectName(dialect?: SqluiCore.Dialect): string {
    return (dialect && DIALECT_NAMES[dialect]) || super.getDialectName(dialect);
  }

  /** Returns a sample absolute-path URI for a selected format. */
  getSampleConnectionString(dialect?: SqluiCore.Dialect): string {
    const extension = dialect === "yml" ? "yml" : dialect || "json";
    return `${extension}:///absolute/path/to/file.${extension}`;
  }

  /** Provides local-file URI guidance and the read-only query entrypoint. */
  getConnectionSetupGuide(dialect?: SqluiCore.Dialect): string {
    const scheme = dialect || "json";
    return `<strong>Expected format:</strong> <code>${this.getSampleConnectionString(scheme)}</code><br/>Use an absolute path. Right-click the file table and choose <strong>Select JSON</strong>; call <code>display(res_json)</code> to show results.`;
  }

  /** Returns the clean table-level command for displaying a parsed document. */
  getTableScripts(): SqlAction.TableActionScriptGenerator[] {
    return [getSelectJson];
  }

  /** Returns no database-level commands because this adapter is read-only. */
  getDatabaseScripts(): SqlAction.DatabaseActionScriptGenerator[] {
    return [];
  }

  /** Returns no connection-level commands for this read-only adapter. */
  getConnectionScripts(): SqlAction.ConnectionActionScriptGenerator[] {
    return [];
  }

  /** Returns the default Select JSON query for a file table. */
  getSampleSelectQuery(input: SqlAction.TableInput): SqlAction.Output {
    return getSelectJson(input);
  }
}

export default new FileDataAdapterScripts();
