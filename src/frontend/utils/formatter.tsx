import { format as _formatSQL } from "sql-formatter";
import { js as _formatJS } from "js-beautify";

/**
 * Formats a SQL string using sql-formatter. Falls back to trimming whitespace on failure.
 * @param val - The SQL string to format.
 * @returns The formatted SQL string.
 */
export const formatSQL = (val: string) => {
  try {
    val = _formatSQL(val);
  } catch (err) {
    console.error("formatter.tsx:_formatSQL", err);
    // if it's not working, let's remove all the leading space
    val = val
      .split("\n")
      .map((s) => s.trim())
      .join("\n");
  }
  return val;
};

/**
 * Formats a JavaScript string using js-beautify.
 * @param val - The JavaScript string to format.
 * @returns The formatted JavaScript string.
 */
export const formatJS = (val: string) => {
  try {
    val = _formatJS(val, {
      indent_size: 2,
      space_in_empty_paren: true,
      break_chained_methods: true,
    });
  } catch (err) {
    console.error("formatter.tsx:formatJS", err);
  }

  return val;
};

/**
 * Formats a duration in milliseconds to a compact human-readable string.
 * @param durationMs - The duration in milliseconds.
 * @returns A string like "<= 1s", "350ms", "1.2s", or "5s".
 */
export const formatDuration = (durationMs: number) => {
  if (durationMs <= 1000) return "<= 1s";
  const seconds = durationMs / 1000;
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`;
};

/**
 * Escapes single quotes in a SQL value by doubling them.
 * @param value - The value to escape.
 * @returns The escaped string.
 */
export const escapeSQLValue = (value?: string) => {
  if (value === undefined) {
    value = "";
  }
  return value?.toString().replace(/'/g, `''`);
};

/**
 * Checks whether a value is a valid number.
 * @param value - The value to check.
 * @returns True if the value is numeric.
 */
export const isValueNumber = (value: any) => {
  const parsed = parseFloat(value);
  return typeof parsed === "number" && !isNaN(value);
};

/**
 * Checks whether a value is a boolean or a boolean string ("true"/"false").
 * @param value - The value to check.
 * @returns True if the value is boolean-like.
 */
export const isValueBoolean = (value: any) => {
  return value === true || value === false || value.toString().toLowerCase() === "true" || value.toString().toLowerCase() === "false";
};
