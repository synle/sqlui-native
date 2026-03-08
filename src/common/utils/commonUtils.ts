/**
 * Generates a unique random ID string using a prefix, timestamp, and random number.
 * @param prefix - A string prefix for the generated ID (e.g., "connection", "query").
 * @returns A unique string in the format `{prefix}.{timestamp}.{random}`.
 */
export function getGeneratedRandomId(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000000000000000)}`;
}
