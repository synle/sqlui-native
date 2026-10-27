/** Helpers shared by the frontend Vite configuration and its tests. */

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
 * Resolves the npm package name that owns a Rolldown module id.
 *
 * Matches on path segments rather than substrings so that sibling packages
 * sharing a name prefix (`react` vs `radix-ui` vs `react-transition-group`)
 * are never conflated. The last `/node_modules/` wins so nested and pnpm-style
 * installs resolve to the actual package rather than its host.
 *
 * @param id - Rolldown module id, either POSIX or Windows style.
 * @returns The package name (scope included, e.g. `@mui/material`), or `undefined` when the id is not inside `node_modules`.
 */
export function getNodeModulesPackageName(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, "/");
  const marker = "/node_modules/";
  const markerIndex = normalizedId.lastIndexOf(marker);
  if (markerIndex === -1) {
    return undefined;
  }

  const rest = normalizedId.slice(markerIndex + marker.length);
  const parts = rest.split("/");
  const first = parts[0];
  if (!first) {
    return undefined;
  }
  if (first.startsWith("@")) {
    return parts.length > 1 ? `${first}/${parts[1]}` : undefined;
  }
  return first;
}

/**
 * Groups vendor dependencies into long-lived, separately cacheable chunks.
 *
 * Without this the entry chunk absorbs React, MUI and TanStack Query and nearly
 * doubles in size, so an app-only release invalidates all vendor code too.
 * Returning `undefined` defers to Rolldown's default chunking, which is the safe
 * fallback for anything not explicitly grouped here.
 *
 * @param id - Rolldown module id.
 * @returns The manual chunk name, or `undefined` to defer to Rolldown.
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

/**
 * Ordered matchers that map a Rust target triple to a normalized OS token.
 *
 * The triple is matched as a whole because vendor and ABI segments vary —
 * `aarch64-apple-darwin`, `x86_64-pc-windows-msvc` and
 * `aarch64-unknown-linux-gnu` all have to resolve.
 */
const TRIPLE_OS_MATCHERS: [RegExp, string][] = [
  [/darwin|apple|macos/, "macos"],
  [/windows|msvc|mingw/, "windows"],
  [/android/, "android"],
  [/linux/, "linux"],
];

/** The platform and architecture an artifact is built for. */
export type BuildTarget = {
  /** Normalized OS token (`macos`, `windows`, `linux`, ...), or `""` when unknown. */
  os: string;
  /** Normalized CPU token (`aarch64`, `x86_64`, `i686`, `universal`, ...), or `""` when unknown. */
  arch: string;
  /** Raw Rust target triple, or `""` when the build is not Tauri-driven. */
  triple: string;
};

/**
 * Resolves the artifact target from the environment set by the Tauri CLI.
 *
 * Outside Tauri, the host is not used as a stand-in because a portal bundle
 * built on one OS can run on another. Empty fields let the About dialog use
 * the runtime host reported by the server.
 *
 * @param env - Environment variables to read.
 * @returns Target descriptor; all fields are `""` when no Tauri target is set.
 */
export function resolveBuildTarget(env: Record<string, string | undefined> = process.env): BuildTarget {
  const triple = (env.TAURI_ENV_TARGET_TRIPLE || "").trim();
  const platform = (env.TAURI_ENV_PLATFORM || "").trim().toLowerCase();
  const arch = (env.TAURI_ENV_ARCH || "").trim().toLowerCase();

  if (triple) {
    const lowerTriple = triple.toLowerCase();
    const matchedOs = TRIPLE_OS_MATCHERS.find(([pattern]) => pattern.test(lowerTriple));
    return {
      os: matchedOs ? matchedOs[1] : platform,
      arch: lowerTriple.split("-")[0] || arch,
      triple,
    };
  }

  return { os: platform, arch, triple: "" };
}
