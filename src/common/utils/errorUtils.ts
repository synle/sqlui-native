/** Shared error formatting and adapter cleanup utilities. */

/** Guards against cycles when unwrapping nested error payloads. */
const MAX_ERROR_UNWRAP_DEPTH = 3;

/**
 * Extracts a human-readable error message from a caught error value.
 *
 * Handles SQL errors (sqlMessage), standard Error objects, API error payloads
 * (`{ error }` / `{ ok: false, error }`) and `AggregateError`. The latter matters
 * for socket failures: Node attempts every resolved address (e.g. `::1` and
 * `127.0.0.1`) and reports the batch as an `AggregateError` whose own `message` is
 * empty, so a naive `toString()` yields the useless literal "AggregateError" while
 * the real causes ("connect ECONNREFUSED 127.0.0.1:33062") sit in `errors`.
 *
 * @param err - The caught error value (may be any type).
 * @param fallback - Default message when no useful info can be extracted.
 * @param depth - Internal recursion counter for nested error payloads.
 * @returns A string suitable for returning to the client.
 */
export function formatErrorMessage(err: any, fallback = "Internal Server Error", depth = 0): string {
  if (err === null || err === undefined) {
    return fallback;
  }

  // AggregateError and friends: surface the underlying causes, deduped and ordered.
  if (depth < MAX_ERROR_UNWRAP_DEPTH && Array.isArray(err.errors) && err.errors.length > 0) {
    const causes = err.errors.map((cause: any) => formatErrorMessage(cause, "", depth + 1)).filter(Boolean);
    const details = [...new Set<string>(causes)].join("; ");
    if (details) {
      return details;
    }
  }

  if (err.sqlMessage) {
    return err.sqlMessage;
  }

  if (err.message) {
    return err.message;
  }

  // API/adapter payloads shaped as `{ error }` or `{ ok: false, error }`.
  if (typeof err.error === "string" && err.error) {
    return err.error;
  }

  if (depth < MAX_ERROR_UNWRAP_DEPTH && err.error && typeof err.error === "object") {
    const nested = formatErrorMessage(err.error, "", depth + 1);
    if (nested) {
      return nested;
    }
  }

  // Messageless system errors (ECONNREFUSED, ETIMEDOUT, ...) still carry a code.
  if (err.code) {
    return err.syscall ? `${err.code} (${err.syscall})` : `${err.code}`;
  }

  // A default Object.prototype.toString tells the caller nothing — prefer the fallback.
  const stringified = err.toString?.();
  if (stringified && stringified !== "[object Object]") {
    return stringified;
  }

  return fallback;
}

/**
 * Safely disconnects a data adapter, swallowing any errors.
 * Use in finally blocks to ensure adapter resources are released.
 * @param engine - The data adapter instance with a disconnect method.
 */
export async function safeDisconnect(engine: { disconnect(): Promise<void> }) {
  try {
    await engine.disconnect();
  } catch (_err) {
    // best-effort cleanup
  }
}

/**
 * Backfills missing `createdAt` and `updatedAt` timestamps on a list of items.
 * Mutates items in place and returns whether any items were modified.
 * @param items - Array of items that may have missing timestamps.
 * @param label - Label for console.error log messages (e.g., "connections").
 * @returns True if any items were modified, false otherwise.
 */
export function backfillTimestamps<T extends { id: string; createdAt?: number; updatedAt?: number }>(items: T[], label: string): boolean {
  let dirty = false;
  for (const item of items) {
    if (!item.createdAt || !item.updatedAt) {
      if (!item.createdAt) item.createdAt = Date.now();
      if (!item.updatedAt) item.updatedAt = Date.now();
      console.error(`Endpoints.ts:backfillTimestamps - backfilled timestamps for ${label} ${item.id}`);
      dirty = true;
    }
  }
  return dirty;
}
