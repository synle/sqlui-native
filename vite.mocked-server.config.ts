import { defineConfig } from "vite";
import path from "path";
import appPackage from "./package.json";

// Externalize all dependencies (they'll be available via node_modules at runtime)
const externalsDeps = ["electron", ...Object.keys((appPackage as any).optionalDependencies || {}), ...Object.keys(appPackage.dependencies || {})];

export default defineConfig({
  build: {
    outDir: "build",
    emptyOutDir: false,
    sourcemap: true,
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
