/** Variable resolver — handles {{VAR}} interpolation with 4-layer priority. */

import { randomUUID } from "node:crypto";
import { RestApiVariable } from "src/common/adapters/RestApiDataAdapter/types";

/** Pattern matching {{variableName}} placeholders. */
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Merges multiple variable layers into a single resolved map.
 * Later layers override earlier ones (higher priority last).
 * Disabled variables are excluded.
 * @param layers - Variable arrays ordered from lowest to highest priority.
 * @returns Merged key-value map of resolved variables.
 */
export function mergeVariableLayers(...layers: (RestApiVariable[] | undefined)[]): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const layer of layers) {
    if (!layer) {
      continue;
    }
    for (const variable of layer) {
      if (variable.enabled) {
        merged[variable.key] = variable.value;
      }
    }
  }
  return merged;
}

/**
 * Resolves built-in dynamic variables (prefixed with $).
 * @param name - The variable name (without {{ }}).
 * @returns The resolved value, or undefined if not a dynamic variable.
 */
function resolveDynamic(name: string): string | undefined {
  switch (name) {
    case "$timestamp":
      return String(Date.now());
    case "$isoTimestamp":
      return new Date().toISOString();
    case "$randomUUID":
      return randomUUID();
    case "$randomInt":
      return String(Math.floor(Math.random() * 1000));
    default:
      return undefined;
  }
}

/**
 * Resolves all {{VAR}} placeholders in a template string.
 * Priority: dynamic vars > merged user vars. Unresolved variables remain as-is.
 * @param template - The string containing {{VAR}} placeholders.
 * @param variables - Merged variable map from mergeVariableLayers().
 * @returns The resolved string with variables substituted.
 */
export function resolveVariables(template: string, variables: Record<string, string>): string {
  return template.replace(VARIABLE_PATTERN, (match, name: string) => {
    const trimmed = name.trim();

    // Check dynamic variables first
    const dynamic = resolveDynamic(trimmed);
    if (dynamic !== undefined) {
      return dynamic;
    }

    // Check user-defined variables
    if (trimmed in variables) {
      return variables[trimmed];
    }

    // Leave unresolved variables as-is
    return match;
  });
}

/**
 * Extracts all variable names referenced in a template string.
 * @param template - The string containing {{VAR}} placeholders.
 * @returns Array of variable names found.
 */
export function extractVariableNames(template: string): string[] {
  const names: string[] = [];
  let match: RegExpExecArray | null;
  const pattern = new RegExp(VARIABLE_PATTERN.source, "g");
  while ((match = pattern.exec(template)) !== null) {
    names.push(match[1].trim());
  }
  return names;
}

/**
 * Finds variable names that remain unresolved after resolution.
 * These are {{VAR}} placeholders still present in the resolved string
 * that are not built-in dynamic variables.
 * @param resolvedString - The string after variable resolution.
 * @returns Array of unresolved variable names (deduplicated).
 */
export function findUnresolvedVariables(resolvedString: string): string[] {
  const unresolved = new Set<string>();
  let match: RegExpExecArray | null;
  const pattern = new RegExp(VARIABLE_PATTERN.source, "g");
  while ((match = pattern.exec(resolvedString)) !== null) {
    const name = match[1].trim();
    // Dynamic variables starting with $ are always resolved at execution time,
    // so they should not appear here — but skip them just in case.
    if (!name.startsWith("$")) {
      unresolved.add(name);
    }
  }
  return Array.from(unresolved);
}
