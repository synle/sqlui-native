import { defineConfig } from "vite";
import path from "path";

// Only externalize packages with native bindings that vite cannot
// bundle. Everything else (pure JS) gets bundled.
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
