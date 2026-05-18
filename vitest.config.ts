import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  define: {
    // Mirror vite.frontend.config.ts globals so build-info utilities import cleanly under Vitest.
    __BUILD_COMMIT__: JSON.stringify("test-commit"),
    __BUILD_CHANNEL__: JSON.stringify("dev"),
    __BUILD_DATE__: JSON.stringify("2026-01-01T00:00:00Z"),
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
    testTimeout: 10000,
    include: ["**/*.spec.{ts,tsx}"],
    exclude: ["**/*.integration.spec.{ts,tsx}", "**/node_modules/**", "**/_SampleDataAdapter_/**", "e2e/**"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json"],
      // Explicit source globs only — never `**/*` or `.` (rule 41).
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.spec.{ts,tsx}",
        "**/*.integration.spec.{ts,tsx}",
        "**/_SampleDataAdapter_/**",
        "**/node_modules/**",
        // Secrets / sensitive (rule 41): defense in depth — these globs are never instrumented.
        ".env*",
        "**/secret*",
        "**/credential*",
        "**/*.pem",
        "**/*.key",
        "**/*.p12",
        "assets/binaries/**",
        "secrets/**",
      ],
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
        statements: 48,
        branches: 37,
        functions: 51,
        lines: 49,
      },
    },
  },
});
