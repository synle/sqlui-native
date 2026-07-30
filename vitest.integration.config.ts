import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  define: {
    // Mirror vite.frontend.config.ts globals so build-info utilities import cleanly under Vitest.
    __BUILD_COMMIT__: JSON.stringify("test-commit"),
    __BUILD_CHANNEL__: JSON.stringify("dev"),
    __BUILD_DATE__: JSON.stringify("2026-01-01T00:00:00Z"),
    __BUILD_TARGET_OS__: JSON.stringify(""),
    __BUILD_TARGET_ARCH__: JSON.stringify(""),
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
      "@typespec/ts-http-runtime/internal": path.resolve(__dirname, "node_modules/@typespec/ts-http-runtime/dist/commonjs"),
    },
  },
  plugins: [
    {
      name: "externalize-node-sqlite",
      resolveId(id) {
        if (id === "node:sqlite" || id === "sqlite") {
          return id;
        }
      },
      load(id) {
        if (id === "node:sqlite" || id === "sqlite") {
          return `export const { DatabaseSync } = require("node:sqlite");`;
        }
      },
    },
  ],
  test: {
    globals: true,
    testTimeout: 30000,
    include: ["**/*.integration.spec.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
