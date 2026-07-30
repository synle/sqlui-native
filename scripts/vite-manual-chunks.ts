/** Manual vendor chunk assignment for the frontend Vite/Rollup build. */

/**
 * npm packages that must be emitted into the same chunk as React core.
 *
 * Splitting any of these away from `react` itself produces a circular chunk
 * import: the chunk holding React's module factory ends up initialized from the
 * chunk holding `react-dom`, so React's namespace object is still `undefined`
 * when its exports are assigned. The runtime symptom is a hard boot failure
 * (`Cannot set properties of undefined (setting 'Activity')`) with the app stuck
 * on the static "Loading..." placeholder.
 */
const REACT_CORE_PACKAGES = new Set([
  "react",
  "react-dom",
  "react-is",
  "scheduler",
  "use-sync-external-store",
  "react-router",
  "react-router-dom",
]);

/**
 * Resolves the npm package name that owns a Rollup module id.
 *
 * Matches on path segments rather than substrings so that sibling packages
 * sharing a name prefix (`react` vs `react-dom` vs `react-transition-group`)
 * are never conflated. The last `/node_modules/` wins so nested and pnpm-style
 * installs resolve to the actual package rather than its host.
 *
 * @param id - Rollup module id, either POSIX or Windows style.
 * @returns The package name (scope included, e.g. `@mui/material`), or `undefined` when the id is not inside `node_modules`.
 */
export function getNodeModulesPackageName(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, "/");
  const marker = "/node_modules/";
  const markerIndex = normalizedId.lastIndexOf(marker);
  if (markerIndex === -1) {
    return undefined;
  }

  const segments = normalizedId.slice(markerIndex + marker.length).split("/");
  const [first, second] = segments;
  if (!first) {
    return undefined;
  }
  if (first.startsWith("@")) {
    return second ? `${first}/${second}` : undefined;
  }
  return first;
}

/**
 * Groups vendor dependencies into long-lived, separately cacheable chunks.
 *
 * Returning `undefined` leaves the module to Rollup's default chunking, which is
 * the safe fallback for anything not explicitly grouped here.
 *
 * @param id - Rollup module id.
 * @returns The manual chunk name, or `undefined` to defer to Rollup.
 */
export function getFrontendManualChunk(id: string): string | undefined {
  const packageName = getNodeModulesPackageName(id);
  if (!packageName) {
    return undefined;
  }

  if (packageName === "monaco-editor") return "vendor-monaco";
  if (REACT_CORE_PACKAGES.has(packageName)) return "vendor-react";
  if (packageName.startsWith("@mui/") || packageName.startsWith("@emotion/")) return "vendor-mui";
  if (packageName === "@tanstack/react-query") return "vendor-tanstack";
  if (packageName.startsWith("@xyflow/")) return "vendor-xyflow";

  return undefined;
}
