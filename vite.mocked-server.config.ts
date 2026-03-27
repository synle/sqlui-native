import { defineConfig } from "vite";
import path from "path";
import appPackage from "./package.json";

/**
 * All runtime dependencies (from package.json) that should remain external in the mocked-server bundle.
 * These are available via node_modules at runtime and do not need to be inlined.
 */
const externalsDeps = [
  "electron",
  ...Object.keys((appPackage as any).optionalDependencies || {}),
  ...Object.keys(appPackage.dependencies || {}),
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
