import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src"),
      "@typespec/ts-http-runtime/internal": path.resolve(__dirname, "node_modules/@typespec/ts-http-runtime/dist/commonjs"),
    },
  },
  test: {
    globals: true,
    testTimeout: 10000,
    include: ["**/*.spec.{ts,tsx}"],
    exclude: ["**/*.integration.spec.{ts,tsx}", "**/node_modules/**", "**/_SampleDataAdapter_/**"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.spec.{ts,tsx}", "**/*.integration.spec.{ts,tsx}", "**/_SampleDataAdapter_/**", "**/node_modules/**"],
    },
  },
});
