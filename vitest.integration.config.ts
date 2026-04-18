import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
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
