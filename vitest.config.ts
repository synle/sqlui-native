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
    testTimeout: 10000,
    include: ["**/*.spec.{ts,tsx}"],
    exclude: ["**/*.integration.spec.{ts,tsx}", "**/node_modules/**", "**/_SampleDataAdapter_/**", "e2e/**"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.spec.{ts,tsx}", "**/*.integration.spec.{ts,tsx}", "**/_SampleDataAdapter_/**", "**/node_modules/**"],
      /**
       * Coverage thresholds — minimums that must be met or exceeded.
       *
       * Vitest exits non-zero when any metric drops below these, so any CI
       * job invoking `vitest run --coverage.enabled` enforces them without
       * needing additional shell glue. The bash threshold check in
       * `.github/workflows/integration-test.yml` (Report and enforce JS/TS
       * coverage) remains as a defense-in-depth layer that also produces
       * the GitHub Actions step-summary table.
       *
       * Baselines captured when the JS/TS coverage pipeline was hardened.
       * Bump these when coverage genuinely improves to lock in the new floor.
       * Mirror any change in MIN_* values in integration-test.yml.
       */
      thresholds: {
        statements: 37.82,
        branches: 30.07,
        functions: 41.12,
        lines: 38.51,
      },
    },
  },
});
