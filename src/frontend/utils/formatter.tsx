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
  } catch (err) {}

  return val;
};

/**
 * Formats a duration in milliseconds to a human-readable string.
 * @param durationMs - The duration in milliseconds.
 * @returns A string like "X seconds" or "<= 1 second".
 */
export const formatDuration = (durationMs: number) => {
  const durationS = Math.floor(durationMs / 1000);
  if (durationS > 1) return `${durationS} seconds`;

  return "<= 1 second";
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
