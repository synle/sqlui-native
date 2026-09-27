/**
 * Cursor-aware filtering of SQL autocomplete suggestions.
 *
 * Pure functions (no Monaco dependency) so the rules are unit-testable:
 * - `alias.` / `table.` → the columns of the table the qualifier resolves to
 * - `database.`         → the tables of the current database
 * - after FROM / JOIN / INTO / UPDATE / TABLE → databases and tables only
 * - anywhere else       → the full suggestion list, unchanged
 *
 * Alias resolution is a regex scan of `FROM|JOIN|UPDATE|INTO <table> [AS] <alias>`, not a SQL
 * parser: comma-joined tables after the first (`FROM a x, b y`) and subquery aliases are not
 * resolved. Upgrade path if that matters: a real tokenizer such as `node-sql-parser`.
 */
import type { CompletionItem } from "src/frontend/components/CodeEditorBox";

/** A column known for a table, as cached in the schema. */
export type CompletionColumn = { name: string; type?: string };

/** Columns for each table name in the current database. */
export type CompletionColumnsByTable = Record<string, CompletionColumn[]>;

/** One identifier segment: bare, `backticked`, "double-quoted", or [bracketed]. */
const IDENT = String.raw`(?:[A-Za-z_][\w$]*|\x60[^\x60]+\x60|"[^"]+"|\[[^\]]+\])`;

/** `qualifier.partial` immediately before the cursor. */
const QUALIFIED_TAIL = new RegExp(String.raw`(${IDENT})\.([\w$]*)$`);

/** Table reference with optional alias after a table-introducing keyword. */
const TABLE_REFERENCE = new RegExp(
  String.raw`\b(?:from|join|update|into)\s+(${IDENT}(?:\.${IDENT})?)(?:\s+(?:as\s+)?([A-Za-z_][\w$]*))?`,
  "gi",
);

/** Keywords after which the next token is a table name. */
const TABLE_POSITION_KEYWORDS = new Set(["from", "join", "into", "update", "table"]);

/** Words that can follow a table reference and must not be mistaken for an alias. */
const NON_ALIAS_WORDS = new Set([
  "where",
  "on",
  "using",
  "join",
  "inner",
  "left",
  "right",
  "full",
  "outer",
  "cross",
  "natural",
  "group",
  "order",
  "limit",
  "offset",
  "having",
  "union",
  "set",
  "values",
  "select",
  "as",
  "with",
  "window",
  "fetch",
]);

/**
 * Strips identifier quoting and lower-cases for case-insensitive comparison.
 * @param identifier - A possibly quoted identifier.
 * @returns The bare, lower-cased identifier.
 */
function normalizeIdentifier(identifier: string): string {
  return identifier.replace(/^[\x60"[]|[\x60"\]]$/g, "").toLowerCase();
}

/**
 * Maps every alias (and bare table name) referenced in the query to its table name.
 * @param sql - Full editor text.
 * @returns Lower-cased alias → lower-cased table name.
 */
export function parseTableAliases(sql: string): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const match of sql.matchAll(TABLE_REFERENCE)) {
    const segments = match[1].split(".");
    const table = normalizeIdentifier(segments[segments.length - 1]);
    aliases.set(table, table);
    const alias = match[2]?.toLowerCase();
    if (alias && !NON_ALIAS_WORDS.has(alias)) {
      aliases.set(alias, table);
    }
  }
  return aliases;
}

/**
 * Finds columns for a table name, case-insensitively.
 * @param columnsByTable - Cached columns keyed by table name.
 * @param table - Lower-cased table name.
 * @returns The table's columns, or undefined when unknown.
 */
function findColumns(columnsByTable: CompletionColumnsByTable, table: string): CompletionColumn[] | undefined {
  for (const [name, columns] of Object.entries(columnsByTable)) {
    if (name.toLowerCase() === table) {
      return columns;
    }
  }
  return undefined;
}

/**
 * Returns the suggestions appropriate for the cursor position.
 * @param textBeforeCursor - Editor text from the start up to the cursor.
 * @param fullText - Entire editor text (aliases may be declared after the cursor).
 * @param items - The full, context-free suggestion list.
 * @param columnsByTable - Cached columns per table, used to resolve `alias.`.
 * @returns The filtered suggestions; `items` unchanged when no rule applies.
 */
export function getContextualCompletions(
  textBeforeCursor: string,
  fullText: string,
  items: CompletionItem[],
  columnsByTable: CompletionColumnsByTable = {},
): CompletionItem[] {
  const qualified = textBeforeCursor.match(QUALIFIED_TAIL);
  if (qualified) {
    const qualifier = normalizeIdentifier(qualified[1]);
    const table = parseTableAliases(fullText).get(qualifier) ?? qualifier;
    const columns = findColumns(columnsByTable, table);
    if (columns) {
      return columns.map((column) => ({
        label: column.name,
        kind: "column",
        detail: `Column (${table}${column.type ? ` - ${column.type}` : ""})`,
      }));
    }
    const isDatabase = items.some((item) => item.kind === "database" && item.label.toLowerCase() === qualifier);
    if (isDatabase) {
      return items.filter((item) => item.kind === "table");
    }
    return items;
  }

  const previousWord = textBeforeCursor
    .replace(/[\w$]*$/, "")
    .trimEnd()
    .match(/([A-Za-z]+)$/)?.[1]
    ?.toLowerCase();
  if (previousWord && TABLE_POSITION_KEYWORDS.has(previousWord)) {
    return items.filter((item) => item.kind === "table" || item.kind === "database");
  }

  return items;
}
