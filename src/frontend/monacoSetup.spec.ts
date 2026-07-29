// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { monaco } from "src/frontend/monacoSetup";

/**
 * Languages that must be registered because frontend code reaches them.
 *
 * Derivation (update when adding a dialect or language mode):
 * - adapters' getSyntaxMode() returns: sql, javascript, graphql, shell
 * - SqluiCore.LanguageMode: javascript, python, java
 * - REST response sniffing (RestApiResultBox): json, html, text
 * - embedded <style> in html responses needs: css
 * - javascript basic grammar extends: typescript
 */
const REQUIRED_LANGUAGES = new Set([
  "sql",
  "javascript",
  "graphql",
  "shell",
  "json",
  "html",
  "python",
  "java",
  "css",
  "typescript",
  "text",
]);

describe("monacoSetup", () => {
  test("all required languages are registered", () => {
    const registered = monaco.languages.getLanguages();
    const registeredIds = registered.map((l) => l.id);
    const missing = [...REQUIRED_LANGUAGES].filter((id) => !registeredIds.includes(id));
    expect(missing).toEqual([]);
  });

  test("html language service is registered (for App.tsx monaco.languages.html)", () => {
    expect((monaco.languages as any).html).toBeDefined();
    expect((monaco.languages as any).html.htmlDefaults).toBeDefined();
  });

  test("typescript language service is registered (for App.tsx monaco.languages.typescript)", () => {
    expect((monaco.languages as any).typescript).toBeDefined();
    expect((monaco.languages as any).typescript.javascriptDefaults).toBeDefined();
  });

  test("json language service is registered (for App.tsx monaco.languages.json)", () => {
    expect((monaco.languages as any).json).toBeDefined();
    expect((monaco.languages as any).json.jsonDefaults).toBeDefined();
  });
});