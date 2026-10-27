import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { emitEmbeddedAssetsPlugin } from "./scripts/vite-plugin-embed-frontend.mts";

/**
 * Only packages with native bindings (.node files) or Node built-in shims must stay external.
 * Everything else (Hono, database drivers, etc.) is bundled into a single sqlui-server.js,
 * eliminating the need to ship node_modules for the Tauri sidecar.
 *
 * Because this list is empty, subpath imports (e.g. `hono/cors`, `@hono/node-server/serve-static`)
 * are bundled inline alongside their parent packages — no subpath-aware predicate needed here.
 *
 * node:sqlite is a Node 22+ built-in and does not need to be externalized.
 */
const externalsDeps: string[] = [];

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(rootDir, "build");

/**
 * Vite build configuration for the sqlui-server sidecar bundle.
 * Bundles all pure-JS dependencies into a single file for Tauri sidecar deployment,
 * and emits a sibling `sqlui-server-assets.json` containing the React frontend
 * (base64-encoded, read at runtime). This lets the same server binary serve the
 * UI in both Tauri-sidecar and standalone modes — one code path, two callers.
 *
 * Outputs:
 *   - build/sqlui-server.js               (CommonJS, Node 18+, fully bundled)
 *   - build/sqlui-server-assets.json      (base64 map of build/index.html + assets/)
 */
export default defineConfig({
  envDir: false,
  plugins: [
    emitEmbeddedAssetsPlugin({
      assetsDir: buildDir,
      outFile: path.join(buildDir, "sqlui-server-assets.json"),
    }),
  ],
  build: {
    outDir: "build",
    emptyOutDir: false,
    sourcemap: false,
    rolldownOptions: {
      input: "./src/sqlui-server/index.ts",
      external: externalsDeps,
      output: {
        entryFileNames: "sqlui-server.js",
        format: "cjs",
        codeSplitting: false,
      },
    },
    target: "node18",
    minify: true,
    ssr: true,
  },
  ssr: {
    external: externalsDeps,
    noExternal: true,
  },
  resolve: {
    alias: {
      src: path.resolve(rootDir, "src"),
      electron: path.resolve(rootDir, "electron"),
      typings: path.resolve(rootDir, "typings"),
    },
  },
} as any);
