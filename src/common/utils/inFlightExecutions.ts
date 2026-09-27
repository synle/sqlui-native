/** In-memory registry of running query executions, so a later request can cancel one. */
import IDataAdapter from "src/common/adapters/IDataAdapter";

/** Client-supplied execution ids: short, URL-safe tokens only (e.g. a UUID). */
const EXECUTION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const inFlight = new Map<string, IDataAdapter>();

/**
 * Builds the registry key; scoped by connection so an id cannot cancel another connection's query.
 * @param connectionId - The connection the execution runs against.
 * @param executionId - The client-supplied execution id.
 * @returns The registry key.
 */
function toKey(connectionId: string, executionId: string) {
  return `${connectionId}:${executionId}`;
}

/**
 * Returns whether a value is an acceptable execution id.
 * @param executionId - Untrusted value from the request.
 * @returns True for a 1–64 char `[A-Za-z0-9_-]` string.
 */
export function isValidExecutionId(executionId: unknown): executionId is string {
  return typeof executionId === "string" && EXECUTION_ID_PATTERN.test(executionId);
}

/**
 * Registers a running execution. Callers must `unregisterExecution` in a `finally`.
 * @param connectionId - The connection the execution runs against.
 * @param executionId - The validated execution id.
 * @param engine - The adapter running the query.
 */
export function registerExecution(connectionId: string, executionId: string, engine: IDataAdapter) {
  inFlight.set(toKey(connectionId, executionId), engine);
}

/**
 * Removes a finished execution from the registry.
 * @param connectionId - The connection the execution ran against.
 * @param executionId - The execution id.
 */
export function unregisterExecution(connectionId: string, executionId: string) {
  inFlight.delete(toKey(connectionId, executionId));
}

/** Outcome of a cancel request. */
export type CancelOutcome = "cancelled" | "not_found" | "unsupported" | "idle";

/**
 * Asks the adapter running an execution to cancel its query.
 * @param connectionId - The connection the execution runs against.
 * @param executionId - The execution id to cancel.
 * @returns `not_found` when no such execution is running, `unsupported` when the adapter has
 *   no cancel support, `idle` when the adapter had nothing running, otherwise `cancelled`.
 * @throws Whatever the adapter's cancel throws (e.g. side connection failure).
 */
export async function cancelExecution(connectionId: string, executionId: string): Promise<CancelOutcome> {
  const engine = inFlight.get(toKey(connectionId, executionId));
  if (!engine) {
    return "not_found";
  }
  if (typeof engine.cancel !== "function") {
    return "unsupported";
  }
  return (await engine.cancel()) ? "cancelled" : "idle";
}
