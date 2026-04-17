import { defineConfig } from "vite";
import path from "node:path";

/**
 * Packages with native bindings that Vite cannot bundle and must remain external.
 * Pure-JS dependencies (express, body-parser, multer, etc.) are bundled into app.js.
 */
const nativeExternals = ["electron", "cassandra-driver", "monaco-editor", "mongodb", "mustache", "mysql2", "pg", "redis", "tedious"];

/**
 * Vite build configuration for the Electron main process.
 * Outputs a CommonJS bundle at build/main.js targeting Node 18.
 */
export default defineConfig({
  build: {
    outDir: "build",
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: "./src/electron/index.ts",
      external: nativeExternals,
      output: {
        entryFileNames: "app.js",
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
