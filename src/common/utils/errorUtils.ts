/** Shared error formatting and adapter cleanup utilities. */

/**
 * Extracts a human-readable error message from a caught error value.
 * Handles SQL errors (sqlMessage), standard Error objects, and fallback strings.
 * @param err - The caught error value (may be any type).
 * @param fallback - Default message when no useful info can be extracted.
 * @returns A string suitable for returning to the client.
 */
export function formatErrorMessage(err: any, fallback = "Internal Server Error"): string {
  return err?.sqlMessage || err?.message || err?.toString?.() || fallback;
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
