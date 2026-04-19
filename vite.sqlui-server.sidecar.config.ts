import { defineConfig } from "vite";
import path from "node:path";

/**
 * Only packages with native bindings (.node files) or Node built-in shims must stay external.
 * Everything else (Express, database drivers, etc.) is bundled into a single sqlui-server.js,
 * eliminating the need to ship node_modules for the Tauri sidecar.
 *
 * node:sqlite is a Node 22+ built-in and does not need to be externalized.
 */
const externalsDeps: string[] = [];

/**
 * Vite build configuration for the sqlui-server sidecar bundle.
 * Bundles all pure-JS dependencies into a single file for Tauri sidecar deployment.
 * Outputs a CommonJS bundle at build/sqlui-server.js targeting Node 18.
 */
export default defineConfig({
  build: {
    outDir: "build",
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: "./src/sqlui-server/index.ts",
      external: externalsDeps,
      output: {
        entryFileNames: "sqlui-server.js",
        format: "cjs",
        inlineDynamicImports: true,
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
      src: path.resolve(__dirname, "src"),
      electron: path.resolve(__dirname, "electron"),
      typings: path.resolve(__dirname, "typings"),
    },
  },
} as any);
