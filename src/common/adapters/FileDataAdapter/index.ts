/** Read-only adapter for local JSON, JSONC, YAML, TOML, and XML documents. */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { parseFileContent } from "src/common/adapters/FileDataAdapter/parsers";
import { evaluateDataQuery } from "src/common/adapters/FileDataAdapter/queryParser";
import { FILE_DATA_DIALECTS, type ParsedData } from "src/common/adapters/FileDataAdapter/types";
import { SqluiCore } from "typings";

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;
const LOCAL_FILE_ACCESS_ENV = "SQLUI_LOCAL_FILE_ADAPTER_ENABLED";
const DEFAULT_QUERY = "display(res_json);";

/** Read-only data adapter for a single local structured-text file. */
export default class FileDataAdapter extends BaseDataAdapter implements IDataAdapter {
  private readonly filePath: string;

  /**
   * Creates an adapter for the absolute path embedded in a file-format URI.
   * @param connectionOption - Connection URI such as `json:///absolute/path/data.json`.
   * @throws Error when the URI does not contain an absolute path or supported dialect.
   */
  constructor(connectionOption: string) {
    super(connectionOption);
    if (!this.dialect || !FILE_DATA_DIALECTS.some((dialect) => dialect === this.dialect)) {
      throw new Error(`Unsupported local document dialect: ${this.dialect || "unknown"}`);
    }
    this.filePath = parseFilePath(connectionOption);
  }

  /** Reads and parses the configured file to verify the connection. */
  async authenticate(): Promise<void> {
    await this.loadDocument();
  }

  /** Returns one logical database named after the source file. */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    return [{ name: path.basename(this.filePath), tables: [] }];
  }

  /** Returns the single document as a selectable table. */
  async getTables(_database: string | undefined): Promise<SqluiCore.TableMetaData[]> {
    return [{ name: path.basename(this.filePath), columns: [] }];
  }

  /** Infers searchable columns from the parsed document. */
  async getColumns(_table: string, _database: string | undefined): Promise<SqluiCore.ColumnMetaData[]> {
    const { data } = await this.loadDocument();
    const values = Array.isArray(data) ? data : [data];
    return BaseDataAdapter.inferTypesFromItems(values.map(toSchemaItem));
  }

  /** Runs the restricted query against the parsed document and retains its exact source text. */
  async execute(sql: string, _database: string | undefined, _table: string | undefined): Promise<SqluiCore.Result> {
    const { data, source } = await this.loadDocument();
    const result = evaluateDataQuery(sql.trim() || DEFAULT_QUERY, data);
    return {
      ok: true,
      raw: [result],
      meta: {
        isFileData: true,
        rawSource: source,
        sourceFormat: this.dialect,
      },
    };
  }

  /** No resources remain open between operations. */
  async disconnect(): Promise<void> {}

  /** Reads and parses the configured file after enforcing local-access and size limits. */
  private async loadDocument(): Promise<{ data: ParsedData; source: string }> {
    this.assertLocalFileAccessEnabled();

    const fileStats = await stat(this.filePath).catch((err: unknown) => {
      throw sanitizeFileSystemError(err);
    });
    if (!fileStats.isFile()) throw new Error("Local document path must refer to a regular file.");
    if (fileStats.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new Error(`Local document exceeds the ${MAX_DOCUMENT_SIZE_BYTES}-byte size limit.`);
    }

    const source = await readFile(this.filePath, "utf8").catch((err: unknown) => {
      throw sanitizeFileSystemError(err);
    });
    if (Buffer.byteLength(source, "utf8") > MAX_DOCUMENT_SIZE_BYTES) {
      throw new Error(`Local document exceeds the ${MAX_DOCUMENT_SIZE_BYTES}-byte size limit.`);
    }

    return { data: parseFileContent(this.dialect as SqluiCore.Dialect, source), source };
  }

  /** Rejects file access when a server is configured for network clients. */
  private assertLocalFileAccessEnabled(): void {
    if (process.env[LOCAL_FILE_ACCESS_ENV] !== "true") {
      throw new Error("Local file connections are disabled on network-bound servers. Bind the portal to 127.0.0.1 to enable them.");
    }
  }
}

/** Converts scalar or array values into rows accepted by the schema inference helper. */
function toSchemaItem(value: ParsedData): Record<string, ParsedData> {
  if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
    return value as Record<string, ParsedData>;
  }
  return { value: value instanceof Date ? value.toISOString() : value };
}

/** Redacts filesystem paths while retaining a safe Node error code for classification. */
function sanitizeFileSystemError(error: unknown): Error {
  if (error instanceof Error && "code" in error && typeof error.code === "string") {
    const safeError = new Error(`Local document file access failed (${error.code}).`) as NodeJS.ErrnoException;
    safeError.code = error.code;
    return safeError;
  }
  return new Error("Local document file access failed.");
}

/** Parses and validates an absolute filesystem path from a dialect URI. */
function parseFilePath(connection: string): string {
  const separatorIndex = connection.indexOf("://");
  const encodedPath = connection.slice(separatorIndex + 3);
  if (separatorIndex < 1 || !encodedPath) throw new Error("Local file connection must include an absolute path after the scheme.");

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(encodedPath);
  } catch (err) {
    if (err instanceof URIError) throw new Error("Local file connection contains invalid percent-encoding.");
    throw err;
  }

  if (decodedPath.includes("\0")) throw new Error("Local file path cannot contain a null character.");
  if (process.platform === "win32" && /^\/[A-Za-z]:[\\/]/.test(decodedPath)) decodedPath = decodedPath.slice(1);

  const isAbsolute = path.isAbsolute(decodedPath) || (process.platform === "win32" && path.win32.isAbsolute(decodedPath));
  if (!isAbsolute) throw new Error("Local file connection requires an absolute filesystem path.");
  return path.normalize(decodedPath);
}
