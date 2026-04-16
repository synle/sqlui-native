import { defineConfig } from "vite";
import path from "node:path";
import appPackage from "./package.json";

/**
 * Only packages with native bindings (.node files) must stay external.
 * Everything else is bundled into a single mocked-server.js by Vite,
 * eliminating the need to copy hundreds of node_modules for the sidecar.
 */
const externalsDeps = [
  "electron",
  "better-sqlite3",
];

/**
 * Vite build configuration for the mocked Express server.
 * Outputs a CommonJS bundle at build/mocked-server.js targeting Node 18.
 */
export default defineConfig({
  build: {
    outDir: "build",
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: "./src/mocked-server/index.ts",
      external: externalsDeps,
      output: {
        entryFileNames: "mocked-server.js",
        format: "cjs",
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
