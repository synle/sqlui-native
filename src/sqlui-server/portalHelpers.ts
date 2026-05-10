/**
 * Pure helpers used by portal mode (`portal.ts`).
 *
 * Lives in its own module so unit tests can import these functions without
 * triggering portal.ts's top-level side effects (env setup, asset extraction,
 * server startup IIFE).
 */

import fs from "node:fs";
import path from "node:path";
import { getDialectTypeFromConnectionString } from "src/common/adapters/DataScriptFactory";

/**
 * Normalizes a CLI input into a canonical connection string.
 *
 * Rules:
 *   - `dialect://...`   → returned as-is
 *   - existing file path or `*.sqlite|*.db|*.sqlite3` → `sqlite://<absolute-path>`
 *   - anything else → returned as-is (lets the user pass exotic Microsoft-style
 *     strings that don't start with a scheme; we trust them)
 *
 * @param input - Raw CLI argument.
 * @returns Canonical connection string suitable for ConnectionProps.connection.
 */
export function normalizeConnectionInput(input: string): string {
  // already a scheme://… connection string (incl. aztable://, sfdc://, …)
  if (/^[a-z0-9+-]+:\/\//i.test(input)) {
    return input;
  }

  // looks like a sqlite file: existing path or known suffix
  const looksLikeSqlite = /\.(sqlite3?|db)$/i.test(input);
  const resolved = path.resolve(input);
  if (fs.existsSync(resolved) || looksLikeSqlite) {
    return `sqlite://${resolved}`;
  }

  return input;
}

/**
 * Derives a friendly display name for a connection from its connection string.
 * Tries (in order): a sqlite filename basename, the URL host[:port], or a generic label.
 *
 * @param connectionString - Canonical connection string (output of {@link normalizeConnectionInput}).
 * @returns Human-readable name suitable for ConnectionProps.name.
 */
export function deriveConnectionName(connectionString: string): string {
  if (connectionString.toLowerCase().startsWith("sqlite://")) {
    const p = connectionString.slice("sqlite://".length);
    const base = path.basename(p);
    return base || "SQLite";
  }
  try {
    const u = new URL(connectionString);
    const dialect = (u.protocol || "").replace(/:$/, "") || "connection";
    const host = u.host || u.hostname || "";
    return host ? `${dialect} (${host})` : dialect;
  } catch {
    const dialect = getDialectTypeFromConnectionString(connectionString) || "connection";
    return dialect;
  }
}
