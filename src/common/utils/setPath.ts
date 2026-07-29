/**
 * Lightweight deep-property setter — drop-in replacement for `lodash.set`.
 *
 * Why this exists: the only consumers of `lodash.set` in this repo are a
 * frontend view (`RecordPage`) and a frontend-reachable script
 * (`MongoDBDataAdapter/scripts.ts`). Shipping a 14-year-old micro-package for
 * two call sites is wasteful — and there is no Node / language built-in for
 * Lodash-style path setting. This helper is pure TypeScript (no Node APIs) so
 * it is safe to import from frontend-reachable code per the module-boundary
 * rules in CLAUDE.md.
 *
 * Semantics intentionally match the subset of `lodash.set` we actually use:
 *  - `path` may be a dotted string (`"a.b.c"`, `"a[0].b"`) or an array of
 *    segments (`["a", "b", "c"]` or `["a", 0, "b"]`).
 *  - Intermediate containers are created on demand. The next segment decides
 *    the container type: numeric → array, otherwise → plain object.
 *  - The target object is mutated in place and returned.
 *
 * Not supported (unused by callers): the lodash 3-arg "customizer" variant.
 */

/**
 * Parses a path string into individual segments, handling both dot-notation
 * (`a.b.c`) and bracket-notation (`a[0].b`). Numeric segments are returned as
 * numbers so callers can use them to drive array-vs-object container choice.
 *
 * @param path - The dotted / bracketed path string.
 * @returns Ordered list of segments — string keys and numeric indices.
 */
function parsePath(path: string): (string | number)[] {
  const segments: (string | number)[] = [];
  // Matches either `[123]` (numeric index) or a bare word segment between
  // dots or brackets. The character class is intentionally permissive so it
  // tolerates non-ASCII identifiers as well.
  const tokenRegex = /\[(\d+)\]|([^.[\]]+)/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      segments.push(Number(match[1]));
    } else if (match[2] !== undefined) {
      // Promote all-digit bare segments (e.g. the `0` in `a.0`) to numeric
      // indices so array creation matches lodash behavior.
      segments.push(/^\d+$/.test(match[2]) ? Number(match[2]) : match[2]);
    }
  }
  return segments;
}

/**
 * Sets `value` at the deep `path` inside `obj`, creating any missing
 * intermediate containers (arrays for numeric segments, objects otherwise).
 *
 * @param obj - The target object to mutate.
 * @param path - The destination path, as a dotted/bracketed string or an
 *   array of segments.
 * @param value - The value to assign at the leaf.
 * @returns The same `obj` reference, for chaining / parity with lodash.
 */
export function setPath<T extends object>(
  obj: T,
  path: string | (string | number)[],
  value: unknown,
): T {
  const segments: (string | number)[] = Array.isArray(path) ? path.slice() : parsePath(path);
  if (segments.length === 0) {
    return obj;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    const nextKey = segments[i + 1];
    const existing = cursor[key];
    if (existing === null || typeof existing !== "object") {
      // Create the right container shape based on what the *next* segment
      // expects. Numeric next-segment → array; otherwise → object.
      cursor[key] = typeof nextKey === "number" ? [] : {};
    }
    cursor = cursor[key];
  }
  cursor[segments[segments.length - 1]] = value;
  return obj;
}
