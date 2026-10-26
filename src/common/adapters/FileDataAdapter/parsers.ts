/** Parses supported local document formats into JavaScript data values. */

import { parse as parseToml } from "@iarna/toml";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { parse as parseJsonc, type ParseError, printParseErrorCode } from "jsonc-parser";
import { parseDocument } from "yaml";
import type { ParsedData } from "src/common/adapters/FileDataAdapter/types";
import { SqluiCore } from "typings";

/**
 * Parses one source document using the selected file-format dialect.
 * @param dialect - The registered file-format scheme.
 * @param source - Exact UTF-8 contents read from the configured file.
 * @returns The parsed document value.
 * @throws SyntaxError when the source is malformed or the dialect is unsupported.
 */
export function parseFileContent(dialect: SqluiCore.Dialect, source: string): ParsedData {
  switch (dialect) {
    case "json":
      return parseJsonContent(source);
    case "jsonc":
      return parseJsoncContent(source);
    case "yaml":
    case "yml":
      return parseYamlContent(source);
    case "toml":
      return parseToml(source) as ParsedData;
    case "xml":
      return parseXmlContent(source);
    default:
      throw new SyntaxError(`Unsupported document format: ${dialect}`);
  }
}

/** Parses strict JSON and preserves useful syntax diagnostics. */
function parseJsonContent(source: string): ParsedData {
  try {
    return JSON.parse(source) as ParsedData;
  } catch (err) {
    if (err instanceof SyntaxError) throw new SyntaxError(`Invalid JSON: ${err.message}`);
    throw err;
  }
}

/** Parses JSONC and reports the first parser diagnostic instead of returning a partial object. */
function parseJsoncContent(source: string): ParsedData {
  const errors: ParseError[] = [];
  const data = parseJsonc(source, errors, { allowTrailingComma: true, allowEmptyContent: false });
  if (errors.length > 0) {
    const error = errors[0];
    throw new SyntaxError(`Invalid JSONC: ${printParseErrorCode(error.error)} at offset ${error.offset}.`);
  }
  return data as ParsedData;
}

/** Parses one YAML document and rejects recoverable parser errors. */
function parseYamlContent(source: string): ParsedData {
  const document = parseDocument(source, { prettyErrors: true });
  if (document.errors.length > 0) {
    throw new SyntaxError(`Invalid YAML: ${document.errors[0].message}`);
  }
  return document.toJS() as ParsedData;
}

/** Validates XML before parsing it with attributes retained as object properties. */
function parseXmlContent(source: string): ParsedData {
  const validation = XMLValidator.validate(source);
  if (validation !== true) {
    throw new SyntaxError(`Invalid XML at ${validation.err.line}:${validation.err.col}: ${validation.err.msg}`);
  }

  return new XMLParser({ ignoreAttributes: false, parseAttributeValue: true }).parse(source) as ParsedData;
}
