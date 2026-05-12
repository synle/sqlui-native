import { defineConfig } from "vite";
import path from "node:path";
import appPackage from "./package.json";

/**
 * All runtime dependencies (from package.json) that should remain external in the sqlui-server bundle.
 * These are available via node_modules at runtime and do not need to be inlined.
 */
const externalDeps = new Set<string>([
  ...Object.keys((appPackage as any).optionalDependencies || {}),
  ...Object.keys(appPackage.dependencies || {}),
]);

/**
 * Predicate used as Rollup's `external` config. Matches both exact package names
 * (e.g. `hono`) AND subpath imports (e.g. `hono/cors`, `@hono/node-server/serve-static`)
 * so Rollup does not try to resolve subpaths that aren't covered by an exact-match
 * external list. Scoped packages (`@scope/name`) are matched on the two-segment prefix.
 */
function isExternal(id: string): boolean {
  if (externalDeps.has(id)) return true;
  const firstSegment = id.startsWith("@") ? id.split("/").slice(0, 2).join("/") : id.split("/")[0];
  return externalDeps.has(firstSegment);
}

/**
 * Vite build configuration for the sqlui-server.
 * Outputs a CommonJS bundle at build/sqlui-server.js targeting Node 18.
 */
export default defineConfig({
  build: {
    outDir: "build",
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: "./src/sqlui-server/index.ts",
      external: isExternal,
      output: {
        entryFileNames: "sqlui-server.js",
        format: "cjs",
      },
    },
    target: "node18",
    minify: true,
    ssr: true,
  },
  ssr: {
    external: [...externalDeps],
    noExternal: true,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
      electron: path.resolve(__dirname, "electron"),
      typings: path.resolve(__dirname, "typings"),
    },
  },
} as any);
