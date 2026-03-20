import { defineConfig } from "vite";
import path from "path";

/**
 * Packages with native bindings that Vite cannot bundle and must remain external.
 * Pure-JS dependencies are bundled directly into the output.
 */
const nativeExternals = [
  "electron",
  "cassandra-driver",
  "monaco-editor",
  "mongodb",
  "mustache",
  "mysql2",
  "pg",
  "pg-hstore",
  "redis",
  "sequelize",
  "sqlite3",
  "tedious",
];

/**
 * Vite build configuration for the Electron main process.
 * Outputs a CommonJS bundle at build/main.js targeting Node 18.
 */
export default defineConfig({
  build: {
    outDir: "build",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: "./src/electron/index.ts",
      external: nativeExternals,
      output: {
        entryFileNames: "main.js",
        format: "cjs",
        banner: `if(typeof globalThis.crypto==="undefined"){globalThis.crypto=require("crypto");}`,
      },
    },
    target: "node18",
    minify: true,
    ssr: true,
  },
  ssr: {
    // Bundle everything except the native externals
    noExternal: true,
    external: nativeExternals,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
      electron: path.resolve(__dirname, "electron"),
      typings: path.resolve(__dirname, "typings"),
    },
  },
} as any);
